-- Lets a signed-in user delete an organization only while it has zero
-- members. Needed for provisionOrganization()'s race-condition cleanup: if
-- two concurrent requests both try to provision an org for the same new
-- user, the loser must be able to remove the now-unused org it created.
-- Never allows deleting a populated (real) organization.
create policy "authenticated_delete_empty_organization" on organizations for delete
  to authenticated
  using (not exists (select 1 from profiles where profiles.organization_id = organizations.id));
