export function inviteUrl(username: string) {
  return `${window.location.origin}/i/${username}`;
}

/** Opens the phone's share sheet when there is one; otherwise copies the link. Returns what happened. */
export async function shareLink(url: string, text: string): Promise<"shared" | "copied" | "cancelled"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Pace", text, url });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(url)) ? "copied" : "cancelled";
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
