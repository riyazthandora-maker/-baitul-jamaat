-- Migration 011: families + family_members tables with RLS

CREATE TABLE families (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id      UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  head_member_id UUID NOT NULL REFERENCES members(id) ON DELETE RESTRICT
);

CREATE TABLE family_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  masjid_id    UUID NOT NULL REFERENCES masjids(id) ON DELETE CASCADE,
  family_id    UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  member_id    UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('head','husband','wife','son','daughter','father','mother','brother','sister','other')),
  UNIQUE(family_id, member_id)
);

CREATE INDEX idx_families_masjid_id ON families(masjid_id);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
CREATE INDEX idx_family_members_member_id ON family_members(member_id);

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin: full access to families"
  ON families FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own families"
  ON families FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());

CREATE POLICY "super_admin: full access to family_members"
  ON family_members FOR ALL
  USING (auth_role() = 'super_admin')
  WITH CHECK (auth_role() = 'super_admin');

CREATE POLICY "masjid_admin: full access to own family_members"
  ON family_members FOR ALL
  USING (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id())
  WITH CHECK (auth_role() = 'masjid_admin' AND masjid_id = auth_masjid_id());
