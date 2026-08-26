-- ===== ADMIN DASHBOARD: align RLS with the editor/moderator role spec =====
-- The write-up is explicit: "editors will have the power to do everything
-- except manage user roles" and "moderators... managing statistics" (the
-- hub_stats live-figures tiles). A lot of pre-existing admin-only policies
-- used has_role(admin) (an exact-tier check) rather than has_min_role, so
-- under the single-role-per-user model the admin dashboard's Users page
-- uses, an editor (who only holds the 'editor' row) was silently locked out
-- of things they're supposed to have. This migration widens those checks.

-- Report review is a moderator (and up) duty — replace the admin-or-moderator
-- OR chains with has_min_role so editor/admin inherit it too.
DROP POLICY IF EXISTS "reports_delete_own" ON public.accident_reports;
CREATE POLICY "reports_delete_own" ON public.accident_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "reports_read_approved" ON public.accident_reports;
CREATE POLICY "reports_read_approved" ON public.accident_reports FOR SELECT
  USING (status = 'approved' OR auth.uid() = user_id OR public.has_min_role(auth.uid(),'moderator'));

DROP POLICY IF EXISTS "reports_update_own" ON public.accident_reports;
CREATE POLICY "reports_update_own" ON public.accident_reports FOR UPDATE TO authenticated
  USING ((auth.uid() = user_id AND status <> 'approved') OR public.has_min_role(auth.uid(),'moderator'))
  WITH CHECK ((auth.uid() = user_id AND status <> 'approved') OR public.has_min_role(auth.uid(),'moderator'));

-- Explicitly a moderator duty per the write-up.
DROP POLICY IF EXISTS "hub_stats_admin_write" ON public.hub_stats;
CREATE POLICY "hub_stats_admin_write" ON public.hub_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'moderator'))
  WITH CHECK (public.has_min_role(auth.uid(),'moderator'));

-- Everything else admin-only becomes editor-and-above.
DROP POLICY IF EXISTS "featured_picks_admin_write" ON public.featured_picks;
CREATE POLICY "featured_picks_admin_write" ON public.featured_picks FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'))
  WITH CHECK (public.has_min_role(auth.uid(),'editor'));

DROP POLICY IF EXISTS "page_categories_admin_insert" ON public.page_categories;
CREATE POLICY "page_categories_admin_insert" ON public.page_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "page_categories_admin_update" ON public.page_categories;
CREATE POLICY "page_categories_admin_update" ON public.page_categories FOR UPDATE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'))
  WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "page_categories_admin_delete" ON public.page_categories;
CREATE POLICY "page_categories_admin_delete" ON public.page_categories FOR DELETE TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));

DROP POLICY IF EXISTS "newsletter_admin_read" ON public.newsletter_subscribers;
CREATE POLICY "newsletter_admin_read" ON public.newsletter_subscribers FOR SELECT TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'));

DROP POLICY IF EXISTS "newsletter_broadcasts_admin_all" ON public.newsletter_broadcasts;
CREATE POLICY "newsletter_broadcasts_admin_all" ON public.newsletter_broadcasts FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor'))
  WITH CHECK (public.has_min_role(auth.uid(),'editor'));

DROP POLICY IF EXISTS "pages_update_own" ON public.pages;
CREATE POLICY "pages_update_own" ON public.pages FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id OR public.has_min_role(auth.uid(),'editor'))
  WITH CHECK (auth.uid() = owner_id OR public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "pages_delete_own" ON public.pages;
CREATE POLICY "pages_delete_own" ON public.pages FOR DELETE TO authenticated
  USING (auth.uid() = owner_id OR public.has_min_role(auth.uid(),'editor'));

DROP POLICY IF EXISTS "cause_admin_write" ON public.cause_stats;
CREATE POLICY "cause_admin_write" ON public.cause_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "county_admin_write" ON public.county_stats;
CREATE POLICY "county_admin_write" ON public.county_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "monthly_admin_write" ON public.monthly_stats;
CREATE POLICY "monthly_admin_write" ON public.monthly_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "roadclass_admin_write" ON public.road_class_stats;
CREATE POLICY "roadclass_admin_write" ON public.road_class_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "tod_admin_write" ON public.time_of_day_stats;
CREATE POLICY "tod_admin_write" ON public.time_of_day_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "vehicle_admin_write" ON public.vehicle_stats;
CREATE POLICY "vehicle_admin_write" ON public.vehicle_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "victim_admin_write" ON public.victim_stats;
CREATE POLICY "victim_admin_write" ON public.victim_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
DROP POLICY IF EXISTS "yearly_admin_write" ON public.yearly_stats;
CREATE POLICY "yearly_admin_write" ON public.yearly_stats FOR ALL TO authenticated
  USING (public.has_min_role(auth.uid(),'editor')) WITH CHECK (public.has_min_role(auth.uid(),'editor'));
