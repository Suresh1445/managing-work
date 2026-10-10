const request = async (path, options = {}) => {
  const token = localStorage.getItem("haven-token");
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || "The request could not be completed.");
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
};

export const api = {
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  me: () => request("/auth/me"),
  list: (name) => request(`/${name}`),
  create: (name, data) => request(`/${name}`, { method: "POST", body: JSON.stringify(data) }),
  update: (name, id, data) => request(`/${name}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (name, id) => request(`/${name}/${id}`, { method: "DELETE" }),
};
