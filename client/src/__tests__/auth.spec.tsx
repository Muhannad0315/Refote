import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../lib/auth";

// We'll mock the supabase client module used by AuthProvider.
let authStateCallback: any = null;

vi.mock("../lib/supabaseClient", () => {
  return {
    default: {
      auth: {
        async getSession() {
          return { data: { session: null } };
        },
        onAuthStateChange(cb: any) {
          authStateCallback = cb;
          return { data: { subscription: { unsubscribe: () => {} } } };
        },
        async signUp({ email }: { email: string }) {
          return { data: { user: { email } }, error: null };
        },
        async signInWithPassword({ email }: { email: string }) {
          return { data: { user: { email } }, error: null };
        },
        async signOut() {
          return { error: null };
        },
      },
    },
  };
});

function Status() {
  const { user, signUp, signIn, signOut } = useAuth();
  return (
    <div>
      <div data-testid="user">{user ? user.email : "-"}</div>
      <button
        onClick={async () => {
          await signUp("a@b.com", "pass");
          // simulate auth state change
          authStateCallback?.("SIGNED_IN", {
            user: { email: "a@b.com" },
            session: { user: { email: "a@b.com" } },
          });
        }}
      >
        SignUp
      </button>
      <button
        onClick={async () => {
          await signIn("a@b.com", "pass");
          authStateCallback?.("SIGNED_IN", {
            user: { email: "a@b.com" },
            session: { user: { email: "a@b.com" } },
          });
        }}
      >
        SignIn
      </button>
      <button
        onClick={async () => {
          await signOut();
          authStateCallback?.("SIGNED_OUT", null);
        }}
      >
        SignOut
      </button>
    </div>
  );
}

describe("AuthProvider / session", () => {
  beforeEach(() => {
    authStateCallback = null;
  });

  it("updates user after sign up via onAuthStateChange", async () => {
    render(
      <AuthProvider>
        <Status />
      </AuthProvider>,
    );

    expect(screen.getByTestId("user").textContent).toBe("-");

    fireEvent.click(screen.getByText("SignUp"));

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("a@b.com"),
    );
  });

  it("clears user on sign out", async () => {
    render(
      <AuthProvider>
        <Status />
      </AuthProvider>,
    );

    // sign in first
    fireEvent.click(screen.getByText("SignIn"));
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("a@b.com"),
    );

    // then sign out
    fireEvent.click(screen.getByText("SignOut"));
    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe("-"),
    );
  });
});
