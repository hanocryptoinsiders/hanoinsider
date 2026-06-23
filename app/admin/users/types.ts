"use client";
// This file contains type definitions and type checking helpers for users list.
export type UserProfileUpdate = {
  role: "free" | "premium" | "admin";
  is_premium: boolean;
  subscription_status: "active" | "inactive" | "cancelled" | "expired";
  status: "active" | "suspended" | "banned";
};
