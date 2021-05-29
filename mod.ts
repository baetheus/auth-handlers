import * as D from "https://deno.land/x/fun@v1.0.0/schemable/decoder.ts";
import * as A from "https://deno.land/x/fun@v1.0.0/affect.ts";
import * as E from "https://deno.land/x/fun@v1.0.0/either.ts";
import * as R from "https://deno.land/x/fun@v1.0.0/record.ts";
import * as O from "https://deno.land/x/oak@v7.5.0/mod.ts";
import { pipe, resolve } from "https://deno.land/x/fun@v1.0.0/fns.ts";

// Client Types
export type RequestError = {
  type: "RequestError";
  status: number;
  message: string;
  context: unknown;
};

export const RegisterUserRequest = D.struct({
  username: D.string,
  password: D.string,
  email: D.string,
});

export type RegisterUserRequest = D.TypeOf<typeof RegisterUserRequest>;

export const RegisterUserResponse = D.struct({
  id: D.string,
  username: D.string,
  role: D.string,
});

export type RegisterUserResponse = D.TypeOf<typeof RegisterUserResponse>;

export interface RegisterUserParams {
  data: RegisterUserRequest;
  headers?: Headers;
}

export const GetUserByUsernameRequest = D.struct({
  username: D.string,
});

export type GetUserByUsernameRequest = D.TypeOf<
  typeof GetUserByUsernameRequest
>;

export const GetUserByUsernameResponse = D.struct({
  id: D.string,
  username: D.string,
  role: D.string,
});

export type GetUserByUsernameResponse = D.TypeOf<
  typeof GetUserByUsernameResponse
>;

export interface GetUserByUsernameParams {
  data: GetUserByUsernameRequest;
  headers: Headers;
}

export interface AuthClient {
  register: A.Affect<RegisterUserParams, RequestError, RegisterUserResponse>;
  getUserByUsername: A.Affect<
    GetUserByUsernameParams,
    RequestError,
    GetUserByUsernameResponse
  >;
}

// Handler Types

export const RegisterRequest = D.struct({
  username: D.string,
  password: D.string,
  email: D.string,
});

export type RegisterRequest = D.TypeOf<typeof RegisterRequest>;

export const RegisterResponse = D.struct({
  id: D.string,
  username: D.string,
  roles: D.string,
});

export type RegisterResponse = D.TypeOf<typeof RegisterResponse>;

export const LoginRequest = D.struct({
  username: D.string,
  password: D.string,
});

export type LoginRequest = D.TypeOf<typeof LoginRequest>;

export const LoginResponse = D.struct({
  id: D.string,
  username: D.string,
  email: D.string,
  roles: D.string,
  token: D.string,
});

export interface AuthHandlerState {
  client: AuthClient;
}

export interface AuthHandlers {
  register: (ctx: O.Context<AuthHandlerState>) => Promise<unknown>;
  login: (ctx: O.Context<AuthHandlerState>) => Promise<unknown>;
}

// Helper Functions

export const createRequestError = (
  message: string,
  context: unknown = {},
  status = 500,
): RequestError => ({ type: "RequestError", status, message, context });

// AuthClient FactorieAs

type User = {
  id: string;
  username: string;
  password: string;
  email: string;
  role: string;
};

const createUser = (user: RegisterRequest): User => ({
  ...user,
  id: Math.random().toString(32).slice(2),
  role: "user",
});

const fromNullable = E.fromNullable(() =>
  createRequestError("Unknown username")
);

export const createInMemoryAuthClient = (
  users: Map<string, User> = new Map(),
): AuthClient => ({
  register: ({ data }) => {
    if (users.has(data.username)) {
      return resolve(
        E.left(createRequestError(`User ${data.username} exists!`, data, 400)),
      );
    }
    const user = createUser(data);
    users.set(user.username, user);
    return resolve(E.right(user));
  },
  getUserByUsername: ({ data }) =>
    resolve(fromNullable(users.get(data.username))),
});

// AuthHandlers Factory

function fromEither<L, R>(ta: E.Either<L, R>): A.Affect<unknown, L, R> {
  return () => resolve(ta);
}

// TODO Pull in jwt secret
export const createAuthHandlers = (client: AuthClient): AuthHandlers => ({
  register: async (ctx) => {
    const headers = ctx.request.headers;

    const request = pipe(
      await ctx.request.body({ type: "json" }).value.catch(() => ({})),
      RegisterRequest,
      E.mapLeft((err) => createRequestError("Bad Request", D.draw(err), 400)),
      E.map((data): RegisterUserParams => {
        // TODO bcrypt password
        return ({ data, headers })
      }),
      fromEither,
      A.compose(client.register),
    );

    pipe(
      await request(null),
      E.fold(
        (err) => {
          ctx.response.status = err.status;
          ctx.response.body = err;
        },
        (body) => {
          ctx.response.body = {
            id: body.id,
            username: body.username,
            role: body.role,
          }
        },
      ),
    );
  },
  login: async (ctx) => {
    const headers = ctx.request.headers;

    const request = pipe(
      await ctx.request.body({ type: "json" }).value.catch(() => ({})),
      LoginRequest,
      E.mapLeft((f) => createRequestError("Bad Request", f, 400)),
      E.map((data): GetUserByUsernameParams => ({ data, headers })),
      fromEither,
      A.compose(client.getUserByUsername),
    );

    const user = await request(null);
    if (E.isLeft(user)) {
      ctx.response.status = user.left.status;
      ctx.response.body = user.left;
    } else {
      // TODO Verify password hash and generate jwt
      ctx.response.body = user.right;

    }
  },
});
