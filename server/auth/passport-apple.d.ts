declare module 'passport-apple' {
  import { Strategy as PassportStrategy } from 'passport';
  
  export interface StrategyOptions {
    clientID: string;
    teamID: string;
    keyID: string;
    privateKeyString?: string;
    privateKeyPath?: string;
    callbackURL: string;
    scope?: string[];
    authorizationURL?: string;
    tokenURL?: string;
    passReqToCallback?: boolean;
  }

  export interface Profile {
    id: string;
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  }

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: (error: Error | null, user?: any) => void
      ) => void
    );
  }
}