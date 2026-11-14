"use client";

import useSWR, { mutate as globalMutate } from "swr";
import { supabase } from "./supabase/client";
import type { Profile } from "./types";

export type PublicProfile = Pick<Profile, "id" | "username" | "display_name" | "avatar_emoji" | "avatar_bg">;
const PROFILE_COLS = "id, username, display_name, avatar_emoji, avatar_bg";

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  other: PublicProfile;
  incoming: boolean;
};

export type GroupSummary = { id: string; name: string; emoji: string; owner_id: string; myStatus: "invited" | "joined"; invitedBy: PublicProfile | null };
export type GroupMember = { user_id: string; status: "invited" | "joined"; profile: PublicProfile };

const refreshSocial = () =>
  globalMutate((key) => key === "friendships" || key === "groups" || (Array.isArray(key) && ["leaderboard", "group", "groupBoard"].includes(key[0])));

export function useFriendships(me: string) {
  return useSWR<Friendship[]>("friendships", async () => {
    const sb = supabase();
    const { data, error } = await sb.from("friendships").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const ids = [...new Set(data.map((f) => (f.requester_id === me ? f.addressee_id : f.requester_id)))];
    const { data: people } = ids.length ? await sb.from("profiles").select(PROFILE_COLS).in("id", ids) : { data: [] };
    return data
      .map((f) => {
        const otherId = f.requester_id === me ? f.addressee_id : f.requester_id;
        const other = (people ?? []).find((p) => p.id === otherId);
        return other ? { ...f, other, incoming: f.addressee_id === me } : null;
      })
      .filter(Boolean) as Friendship[];
  });
}

export async function sendFriendRequest(username: string) {
  const { data, error } = await supabase().rpc("send_friend_request", { p_username: username.replace(/^@/, "") });
  await refreshSocial();
  if (error) throw error;
  return data as "sent" | "accepted" | "already_friends" | "already_sent" | "not_found" | "self";
}

export async function acceptFriend(id: string) {
  const { error } = await supabase().from("friendships").update({ status: "accepted" }).eq("id", id);
  await refreshSocial();
  if (error) throw error;
}

export async function removeFriendship(id: string) {
  const { error } = await supabase().from("friendships").delete().eq("id", id);
  await refreshSocial();
  if (error) throw error;
}

export function useGroups(me: string) {
  return useSWR<GroupSummary[]>("groups", async () => {
    const { data, error } = await supabase()
      .from("group_members")
      .select(`status, invited_by, groups(id, name, emoji, owner_id), inviter:profiles!group_members_invited_by_fkey(${PROFILE_COLS})`)
      .eq("user_id", me);
    if (error) throw error;
    type Row = { status: "invited" | "joined"; groups: Omit<GroupSummary, "myStatus" | "invitedBy"> | null; inviter: PublicProfile | null };
    return (data as unknown as Row[])
      .filter((r) => r.groups)
      .map((r) => ({ ...r.groups!, myStatus: r.status, invitedBy: r.inviter }));
  });
}

export function useGroup(id: string | undefined) {
  return useSWR(id ? ["group", id] : null, async () => {
    const sb = supabase();
    const [{ data: group, error }, { data: members }] = await Promise.all([
      sb.from("groups").select("*").eq("id", id!).maybeSingle(),
      sb.from("group_members").select(`user_id, status, profile:profiles!group_members_user_id_fkey(${PROFILE_COLS})`).eq("group_id", id!),
    ]);
    if (error) throw error;
    return group ? { group: group as { id: string; name: string; emoji: string; owner_id: string }, members: (members ?? []) as unknown as GroupMember[] } : null;
  });
}

export async function createGroup(name: string, emoji: string) {
  const { data, error } = await supabase().from("groups").insert({ name: name.trim(), emoji }).select("id").single();
  await refreshSocial();
  if (error) throw error;
  return data.id as string;
}

export async function inviteToGroup(groupId: string, userId: string, me: string) {
  const { error } = await supabase().from("group_members").insert({ group_id: groupId, user_id: userId, status: "invited", invited_by: me });
  await refreshSocial();
  if (error) throw error;
}

export async function joinGroup(groupId: string, me: string) {
  const { error } = await supabase().from("group_members").update({ status: "joined" }).eq("group_id", groupId).eq("user_id", me);
  await refreshSocial();
  if (error) throw error;
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await supabase().from("group_members").delete().eq("group_id", groupId).eq("user_id", userId);
  await refreshSocial();
  if (error) throw error;
}

// Cheers and comments on a friend's check-in.
const refreshFeed = () => globalMutate((key) => Array.isArray(key) && key[0] === "feed");

export async function setCheer(logId: string, me: string, emoji: string | null) {
  const sb = supabase();
  const { error } = emoji
    ? await sb.from("cheers").upsert({ log_id: logId, user_id: me, emoji }, { onConflict: "log_id,user_id" })
    : await sb.from("cheers").delete().eq("log_id", logId).eq("user_id", me);
  await refreshFeed();
  if (error) throw error;
}

export async function addComment(logId: string, body: string) {
  const { error } = await supabase().from("comments").insert({ log_id: logId, body: body.trim() });
  await refreshFeed();
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await supabase().from("comments").delete().eq("id", id);
  await refreshFeed();
  if (error) throw error;
}

export async function findProfileByUsername(username: string): Promise<PublicProfile | null> {
  const { data } = await supabase().from("profiles").select(PROFILE_COLS).eq("username", username.toLowerCase()).maybeSingle();
  return data;
}
