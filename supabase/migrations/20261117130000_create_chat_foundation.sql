CREATE TABLE public.chat_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL
    REFERENCES public.profiles (id) ON DELETE CASCADE,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id)
);

CREATE TRIGGER chat_conversations_set_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.chat_conversations (id) ON DELETE CASCADE,
  sender_id uuid NOT NULL
    REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body text NOT NULL
    CHECK (
      body = pg_catalog.btrim(body)
      AND body <> ''
      AND pg_catalog.char_length(body) <= 2000
    ),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chat_conversations_last_message_at_idx
  ON public.chat_conversations (last_message_at DESC);

CREATE INDEX chat_messages_conversation_id_created_at_idx
  ON public.chat_messages (conversation_id, created_at ASC, id ASC);

CREATE INDEX chat_messages_sender_id_idx
  ON public.chat_messages (sender_id);

ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own chat conversation"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (
    customer_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS customer_profile
      WHERE customer_profile.id = (SELECT auth.uid())
        AND customer_profile.role = 'CUSTOMER'::public.user_role
        AND customer_profile.is_active = true
    )
  );

CREATE POLICY "Active admins can read all chat conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

CREATE POLICY "Customers can read messages from own chat conversation"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.chat_conversations AS customer_conversation
      WHERE customer_conversation.id = chat_messages.conversation_id
        AND customer_conversation.customer_id = (SELECT auth.uid())
        AND EXISTS (
          SELECT 1
          FROM public.profiles AS customer_profile
          WHERE customer_profile.id = (SELECT auth.uid())
            AND customer_profile.role = 'CUSTOMER'::public.user_role
            AND customer_profile.is_active = true
        )
    )
  );

CREATE POLICY "Active admins can read all chat messages"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING ((SELECT public.is_active_admin()));

REVOKE ALL ON TABLE public.chat_conversations, public.chat_messages
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.chat_conversations, public.chat_messages
  TO authenticated;

CREATE FUNCTION public.send_chat_message(
  p_conversation_id uuid DEFAULT NULL,
  p_body text DEFAULT NULL
)
RETURNS TABLE (
  conversation_id uuid,
  message_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_sender_id uuid := (SELECT auth.uid());
  v_sender_role public.user_role;
  v_body text := pg_catalog.btrim(p_body);
  v_conversation_id uuid;
  v_message_id uuid;
  v_sent_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION USING MESSAGE = 'AUTH_REQUIRED', ERRCODE = '28000';
  END IF;

  SELECT profile.role
  INTO v_sender_role
  FROM public.profiles AS profile
  WHERE profile.id = v_sender_id
    AND profile.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'PROFILE_INVALID', ERRCODE = '42501';
  END IF;

  IF v_body IS NULL OR v_body = '' THEN
    RAISE EXCEPTION USING MESSAGE = 'CHAT_MESSAGE_REQUIRED', ERRCODE = '22023';
  END IF;

  IF pg_catalog.char_length(v_body) > 2000 THEN
    RAISE EXCEPTION USING MESSAGE = 'CHAT_MESSAGE_TOO_LONG', ERRCODE = '22023';
  END IF;

  IF v_sender_role = 'CUSTOMER'::public.user_role THEN
    IF p_conversation_id IS NULL THEN
      INSERT INTO public.chat_conversations (customer_id)
      VALUES (v_sender_id)
      ON CONFLICT (customer_id) DO NOTHING
      RETURNING id INTO v_conversation_id;

      IF v_conversation_id IS NULL THEN
        SELECT conversation.id
        INTO v_conversation_id
        FROM public.chat_conversations AS conversation
        WHERE conversation.customer_id = v_sender_id;
      END IF;
    ELSE
      SELECT conversation.id
      INTO v_conversation_id
      FROM public.chat_conversations AS conversation
      WHERE conversation.id = p_conversation_id
        AND conversation.customer_id = v_sender_id;

      IF NOT FOUND THEN
        IF EXISTS (
          SELECT 1
          FROM public.chat_conversations AS conversation
          WHERE conversation.id = p_conversation_id
        ) THEN
          RAISE EXCEPTION USING MESSAGE = 'CHAT_FORBIDDEN', ERRCODE = '42501';
        END IF;

        RAISE EXCEPTION USING
          MESSAGE = 'CHAT_CONVERSATION_NOT_FOUND',
          ERRCODE = 'P0002';
      END IF;
    END IF;
  ELSIF v_sender_role = 'ADMIN'::public.user_role THEN
    IF NOT public.is_active_admin() THEN
      RAISE EXCEPTION USING MESSAGE = 'PROFILE_INVALID', ERRCODE = '42501';
    END IF;

    IF p_conversation_id IS NULL THEN
      RAISE EXCEPTION USING
        MESSAGE = 'CHAT_CONVERSATION_REQUIRED',
        ERRCODE = '22023';
    END IF;

    SELECT conversation.id
    INTO v_conversation_id
    FROM public.chat_conversations AS conversation
    WHERE conversation.id = p_conversation_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        MESSAGE = 'CHAT_CONVERSATION_NOT_FOUND',
        ERRCODE = 'P0002';
    END IF;
  ELSE
    RAISE EXCEPTION USING MESSAGE = 'CHAT_FORBIDDEN', ERRCODE = '42501';
  END IF;

  INSERT INTO public.chat_messages (
    conversation_id,
    sender_id,
    body,
    created_at
  ) VALUES (
    v_conversation_id,
    v_sender_id,
    v_body,
    v_sent_at
  )
  RETURNING id INTO v_message_id;

  UPDATE public.chat_conversations
  SET last_message_at = v_sent_at
  WHERE id = v_conversation_id;

  RETURN QUERY
  SELECT v_conversation_id, v_message_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_chat_message(uuid, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.send_chat_message(uuid, text)
  TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.chat_conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime
      ADD TABLE public.chat_messages;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
