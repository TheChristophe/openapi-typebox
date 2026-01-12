export type PRecord<K extends keyof never, T> = {
  [P in K]?: T;
};
