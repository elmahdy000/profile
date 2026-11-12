export async function studentApi<T>(url: string, options?: RequestInit): Promise<T> {
  const deviceId = localStorage.getItem("dr_mahmoud_device_id") || "";
  const token = localStorage.getItem("dr_mahmoud_student_token") || "";
  const studentCode = localStorage.getItem("dr_mahmoud_student_code") || "";

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      ...(token ? { Authorization: `Bearer ${token}`, "X-Student-Token": token } : {}),
      ...(studentCode ? { "X-Student-Code": studentCode } : {}),
      ...(options?.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "تعذر إتمام الطلب");
  }
  return data as T;
}

