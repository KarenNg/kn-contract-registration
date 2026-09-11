-- profiles.id is a 1:1 mirror of auth.users.id (already FK'd to it), and is
-- our canonical "user identity" row. Point memberships.user_id at profiles
-- instead of auth.users directly so PostgREST can embed profiles(email,
-- full_name) straight off a memberships query — team/admin listings need
-- the display name, and there's no FK path for that embedding otherwise.
alter table memberships drop constraint memberships_user_id_fkey;
alter table memberships add constraint memberships_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;
