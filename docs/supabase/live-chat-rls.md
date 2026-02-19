# Live Chat RLS policies

Date: 2026-02-19

## Context
Live chat API returned:
"permission denied for schema public"

## Table
public.live_chat_messages

## Fix
Enabled RLS and added:

- SELECT policy for anon/authenticated
- INSERT policy requiring auth.uid() = user_id

This resolved 500 errors from /api/live/chat.
