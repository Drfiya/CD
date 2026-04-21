export interface ActivationSignals {
  /** Always true once the user exists (they signed up). */
  signUp: true;
  /** Profile has name + bio + avatar. */
  profile: boolean;
  /** User enrolled in at least one course. */
  enrollment: boolean;
  /** User created at least one post. */
  firstPost: boolean;
}

export interface ActivationState {
  signals: ActivationSignals;
  /** True when the user already earned the WELCOME badge. */
  welcomeEarned: boolean;
  /** True when the user explicitly dismissed the banner. */
  dismissed: boolean;
}
