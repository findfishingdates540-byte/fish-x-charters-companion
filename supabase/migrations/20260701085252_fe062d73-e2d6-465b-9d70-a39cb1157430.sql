
-- ============ SOCIAL ============
CREATE TABLE public.business_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  media_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  linked_challenge_id uuid,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','followers')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_posts_business ON public.business_posts(business_id, created_at DESC);
GRANT SELECT ON public.business_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_posts TO authenticated;
GRANT ALL ON public.business_posts TO service_role;
ALTER TABLE public.business_posts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.business_followers (
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_id, user_id)
);
CREATE INDEX idx_followers_user ON public.business_followers(user_id);
GRANT SELECT, INSERT, DELETE ON public.business_followers TO authenticated;
GRANT SELECT ON public.business_followers TO anon;
GRANT ALL ON public.business_followers TO service_role;
ALTER TABLE public.business_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Followers are public counts" ON public.business_followers FOR SELECT USING (true);
CREATE POLICY "Users manage own follow" ON public.business_followers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow" ON public.business_followers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Post policies (need business_followers to exist first for the followers-only check)
CREATE POLICY "Public posts visible" ON public.business_posts FOR SELECT
  USING (visibility = 'public');
CREATE POLICY "Followers see follower posts" ON public.business_posts FOR SELECT
  TO authenticated USING (
    visibility = 'followers'
    AND EXISTS (SELECT 1 FROM public.business_followers f WHERE f.business_id = business_posts.business_id AND f.user_id = auth.uid())
  );
CREATE POLICY "Members see all their posts" ON public.business_posts FOR SELECT
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'staff'));
CREATE POLICY "Members create posts" ON public.business_posts FOR INSERT
  TO authenticated WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff') AND author_id = auth.uid());
CREATE POLICY "Members update posts" ON public.business_posts FOR UPDATE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'staff'))
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff'));
CREATE POLICY "Managers delete posts" ON public.business_posts FOR DELETE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'manager'));

CREATE TABLE public.post_likes (
  post_id uuid NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
GRANT SELECT ON public.post_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are public" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Users like" ON public.post_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike" ON public.post_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.business_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_comments_post ON public.post_comments(post_id, created_at);
GRANT SELECT ON public.post_comments TO anon;
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments visible where post is" ON public.post_comments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.business_posts p WHERE p.id = post_id AND p.visibility = 'public'));
CREATE POLICY "Auth comments visible to followers" ON public.post_comments FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.business_posts p
      WHERE p.id = post_id
        AND (p.visibility = 'public'
          OR EXISTS (SELECT 1 FROM public.business_followers f WHERE f.business_id = p.business_id AND f.user_id = auth.uid())
          OR public.is_business_member(p.business_id, auth.uid(), 'staff'))
    )
  );
CREATE POLICY "Users comment" ON public.post_comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors delete own comments" ON public.post_comments FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- ============ MESSAGING ============
CREATE TABLE public.business_buddies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  angler_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','blocked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, angler_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_buddies TO authenticated;
GRANT ALL ON public.business_buddies TO service_role;
ALTER TABLE public.business_buddies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Angler sees own buddies" ON public.business_buddies FOR SELECT
  TO authenticated USING (auth.uid() = angler_id OR public.is_business_member(business_id, auth.uid(), 'staff'));
CREATE POLICY "Angler requests buddy" ON public.business_buddies FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = angler_id);
CREATE POLICY "Business updates status" ON public.business_buddies FOR UPDATE
  TO authenticated USING (public.is_business_member(business_id, auth.uid(), 'staff') OR auth.uid() = angler_id)
  WITH CHECK (public.is_business_member(business_id, auth.uid(), 'staff') OR auth.uid() = angler_id);

CREATE TABLE public.business_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  angler_id uuid NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, angler_id)
);
CREATE INDEX idx_convo_business ON public.business_conversations(business_id, last_message_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.business_conversations TO authenticated;
GRANT ALL ON public.business_conversations TO service_role;
ALTER TABLE public.business_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read conversation" ON public.business_conversations FOR SELECT
  TO authenticated USING (auth.uid() = angler_id OR public.is_business_member(business_id, auth.uid(), 'staff'));
CREATE POLICY "Angler starts conversation" ON public.business_conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = angler_id);

CREATE TABLE public.business_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.business_conversations(id) ON DELETE CASCADE,
  sender_side text NOT NULL CHECK (sender_side IN ('business','angler')),
  sender_id uuid NOT NULL,
  body text,
  media_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_convo ON public.business_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE ON public.business_messages TO authenticated;
GRANT ALL ON public.business_messages TO service_role;
ALTER TABLE public.business_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.business_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.business_conversations c
      WHERE c.id = conversation_id
        AND (auth.uid() = c.angler_id OR public.is_business_member(c.business_id, auth.uid(), 'staff'))
    )
  );
CREATE POLICY "Participants send messages" ON public.business_messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.business_conversations c
      WHERE c.id = conversation_id
        AND (
          (sender_side = 'angler' AND auth.uid() = c.angler_id)
          OR (sender_side = 'business' AND public.is_business_member(c.business_id, auth.uid(), 'staff'))
        )
    )
  );
CREATE POLICY "Recipients mark read" ON public.business_messages FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.business_conversations c
      WHERE c.id = conversation_id
        AND (auth.uid() = c.angler_id OR public.is_business_member(c.business_id, auth.uid(), 'staff'))
    )
  ) WITH CHECK (true);

-- ============ FISH-X BRIDGE ============
CREATE TABLE public.fishx_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  fishx_user_id text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  linked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fishx_user_id)
);
GRANT SELECT ON public.fishx_link TO authenticated;
GRANT ALL ON public.fishx_link TO service_role;
ALTER TABLE public.fishx_link ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own link" ON public.fishx_link FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.fishx_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_fishx_events_type ON public.fishx_webhook_events(event_type, created_at DESC);
GRANT ALL ON public.fishx_webhook_events TO service_role;
ALTER TABLE public.fishx_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies: service_role only

CREATE TRIGGER trg_posts_updated BEFORE UPDATE ON public.business_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
