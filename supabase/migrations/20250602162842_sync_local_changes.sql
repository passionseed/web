
drop policy "Users can view their own profile" on "public"."profiles";

alter table "public"."interests" add column "emotion" text not null;

alter table "public"."interests" add column "type" text;

alter table "public"."profiles" add column "date_of_birth" date;

alter table "public"."profiles" add column "full_name" text;

alter table "public"."profiles" alter column "username" set data type text using "username"::text;

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

create policy "can create"
on "public"."interests"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "view interests"
on "public"."interests"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Enable delete for users based on user_id"
on "public"."profiles"
as permissive
for delete
to public
using ((( SELECT auth.uid() AS uid) = id));


create policy "Users can insert their own profile"
on "public"."profiles"
as restrictive
for insert
to public
with check (true);


create policy "anyone can view profiles"
on "public"."profiles"
as permissive
for select
to public
using (true);



