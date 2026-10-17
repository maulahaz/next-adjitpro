/** Tipe status hasil Server Action (dipakai klien). File ini tanpa impor server. */
export interface ActionState {
  ok: boolean;
  message: string;
  /** true bila sesi berakhir -> klien mengarahkan ke halaman login. */
  sessionExpired?: boolean;
}

export const initialActionState: ActionState = { ok: false, message: "" };
