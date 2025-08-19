SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 15.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'b9ddee66-61f0-46a1-84f9-cfb6cbbcceec', '{"action":"user_signedup","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"discord"}}', '2025-08-17 12:18:40.44366+00', ''),
	('00000000-0000-0000-0000-000000000000', '40ffbcc9-f89a-4836-a4c4-6d3d99e21bef', '{"action":"login","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider_type":"discord"}}', '2025-08-17 12:18:40.765186+00', ''),
	('00000000-0000-0000-0000-000000000000', '176ed7da-5973-4fe9-bcdf-e2905148d8b0', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-17 13:18:29.228242+00', ''),
	('00000000-0000-0000-0000-000000000000', '2cde5dd6-d965-448e-ab6c-5b2b3be30015', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-17 13:18:29.229125+00', ''),
	('00000000-0000-0000-0000-000000000000', '27cba847-9718-46da-9569-b6fb62584484', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-17 13:18:29.256325+00', ''),
	('00000000-0000-0000-0000-000000000000', 'eff0169d-3f37-4e0f-8e4b-31b216d2de9d', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-17 14:17:05.824527+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd718855a-d799-456e-b686-348e68779848', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-17 14:17:05.826319+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ee8de9df-df3b-463f-9813-bf5c996f4014', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 05:20:08.124346+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a631321f-a4da-4380-b3a5-d3766a068b60', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 05:20:08.125078+00', ''),
	('00000000-0000-0000-0000-000000000000', '00ee6982-de88-43f8-9f90-8d7bead0a153', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 06:30:01.468239+00', ''),
	('00000000-0000-0000-0000-000000000000', '489f05b0-6b22-455d-b5d9-54c60e741f4d', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 06:30:01.469301+00', ''),
	('00000000-0000-0000-0000-000000000000', '4cc21da6-d8ef-40f3-8f9b-f4111b3bb3d7', '{"action":"user_signedup","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-08-18 07:30:45.311458+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a0cbfbfa-8745-4020-99f2-df319e205040', '{"action":"login","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-08-18 07:30:45.314312+00', ''),
	('00000000-0000-0000-0000-000000000000', '6064c8ec-41df-44fc-b943-7a6bb608256c', '{"action":"user_recovery_requested","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-08-18 07:30:45.319146+00', ''),
	('00000000-0000-0000-0000-000000000000', '35c53c8d-1233-4ce6-a114-82894a738567', '{"action":"user_signedup","actor_id":"241aa8b2-498f-4efb-99bd-7320e950e01f","actor_username":"sb@gg.gg","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-08-18 07:33:58.823648+00', ''),
	('00000000-0000-0000-0000-000000000000', '48691289-065f-4930-8cd7-4432ad56bd6c', '{"action":"login","actor_id":"241aa8b2-498f-4efb-99bd-7320e950e01f","actor_username":"sb@gg.gg","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-08-18 07:33:58.825234+00', ''),
	('00000000-0000-0000-0000-000000000000', '3f19f3cf-6d12-475b-9233-b61c61b7f1ec', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 07:34:05.162623+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e90dfce9-f3b0-4e22-9b49-e8a435f9841f', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 07:34:05.163631+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bbc91233-bf01-425e-b7df-692c812edb4e', '{"action":"logout","actor_id":"241aa8b2-498f-4efb-99bd-7320e950e01f","actor_username":"sb@gg.gg","actor_via_sso":false,"log_type":"account"}', '2025-08-18 07:36:05.386099+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b7791020-935b-4edf-a1e4-117a89d9aabe', '{"action":"login","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"discord"}}', '2025-08-18 07:36:22.937694+00', ''),
	('00000000-0000-0000-0000-000000000000', '3eb558ee-6577-4682-9cea-2ab11aa147ce', '{"action":"login","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider_type":"discord"}}', '2025-08-18 07:36:23.077589+00', ''),
	('00000000-0000-0000-0000-000000000000', '755aae55-494f-41e0-8c00-22d8e2284eab', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 14:03:47.551548+00', ''),
	('00000000-0000-0000-0000-000000000000', '7b01e60c-f27e-4610-8c25-50522836e255', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 14:03:47.552336+00', ''),
	('00000000-0000-0000-0000-000000000000', '9eb2f836-1286-4ab8-b31a-d375712b87d8', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 14:03:57.163194+00', ''),
	('00000000-0000-0000-0000-000000000000', '561f4a7b-9ec4-46a9-8df9-d1699ec7ee18', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 14:03:57.16352+00', ''),
	('00000000-0000-0000-0000-000000000000', '41c9ab55-7fa5-4d8a-a667-86a621e12928', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 14:03:57.19767+00', ''),
	('00000000-0000-0000-0000-000000000000', '7e94bc78-54d3-4009-a626-5e89ff4f1c8c', '{"action":"logout","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-08-18 14:04:05.330561+00', ''),
	('00000000-0000-0000-0000-000000000000', 'db8b5158-000d-4ccd-8e67-a1d1f2c322f4', '{"action":"user_signedup","actor_id":"66e5df28-a702-480d-b4ba-4f77cfc60581","actor_username":"bysfang@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-08-18 14:04:22.195638+00', ''),
	('00000000-0000-0000-0000-000000000000', '3f295098-d7c9-409e-8041-f7049c7f7282', '{"action":"login","actor_id":"66e5df28-a702-480d-b4ba-4f77cfc60581","actor_username":"bysfang@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-08-18 14:04:22.197691+00', ''),
	('00000000-0000-0000-0000-000000000000', '4b682341-4c95-40a9-a317-b5bd6e68944e', '{"action":"token_refreshed","actor_id":"66e5df28-a702-480d-b4ba-4f77cfc60581","actor_username":"bysfang@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 15:03:49.27996+00', ''),
	('00000000-0000-0000-0000-000000000000', '5ac874d3-3500-41ea-91d7-243d9a2dd441', '{"action":"token_revoked","actor_id":"66e5df28-a702-480d-b4ba-4f77cfc60581","actor_username":"bysfang@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 15:03:49.280951+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ddb95a3b-6295-4e37-a4e0-793bfb04d935', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 15:10:39.164175+00', ''),
	('00000000-0000-0000-0000-000000000000', '9d7bd01c-af9c-4e3c-966d-05ae8aefecb2', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 15:10:39.169042+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dd55029e-4f0d-4941-89fc-7de6b9f177d9', '{"action":"logout","actor_id":"66e5df28-a702-480d-b4ba-4f77cfc60581","actor_username":"bysfang@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-08-18 15:30:58.758451+00', ''),
	('00000000-0000-0000-0000-000000000000', 'dcced424-a9f0-4af1-ad48-ac7e1d9e1648', '{"action":"login","actor_id":"66e5df28-a702-480d-b4ba-4f77cfc60581","actor_username":"bysfang@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-08-18 15:31:15.576155+00', ''),
	('00000000-0000-0000-0000-000000000000', '01e397dc-110f-4d5a-841c-b1fd1fc41cc5', '{"action":"login","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"discord"}}', '2025-08-18 15:35:06.270987+00', ''),
	('00000000-0000-0000-0000-000000000000', '4dde905b-002e-4275-bf98-4509b4480683', '{"action":"login","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider_type":"discord"}}', '2025-08-18 15:35:06.427011+00', ''),
	('00000000-0000-0000-0000-000000000000', '6d3e8e2a-61f3-4009-91b2-6001478c6062', '{"action":"user_signedup","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"google"}}', '2025-08-18 15:52:38.407762+00', ''),
	('00000000-0000-0000-0000-000000000000', '0498f4bc-1c94-48ac-b85b-048e047921a7', '{"action":"login","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider_type":"google"}}', '2025-08-18 15:52:38.698304+00', ''),
	('00000000-0000-0000-0000-000000000000', '2c8cde82-a1be-4447-bf6e-4297544ae22b', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 16:13:13.112048+00', ''),
	('00000000-0000-0000-0000-000000000000', '649dde98-0b23-4927-b82c-bbdc41facfc6', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 16:13:13.112973+00', ''),
	('00000000-0000-0000-0000-000000000000', '12774210-b330-41b8-a8a2-421d8b71d9e7', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 17:08:26.033578+00', ''),
	('00000000-0000-0000-0000-000000000000', '7ef9d3a6-bc20-42d9-bf79-2505f37fde04', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 17:08:26.03544+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ef8c2e91-cea8-4e97-9552-087ebc5f2c83', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 17:14:52.762635+00', ''),
	('00000000-0000-0000-0000-000000000000', '3a64bfec-887a-446b-87a5-de0bcc9c9d4a', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 17:14:52.763264+00', ''),
	('00000000-0000-0000-0000-000000000000', 'adc969cb-28c1-416e-9266-15b05101cf57', '{"action":"token_refreshed","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 17:32:16.584094+00', ''),
	('00000000-0000-0000-0000-000000000000', '67d9253f-edce-4fea-8748-4a28f8619f1b', '{"action":"token_revoked","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 17:32:16.585434+00', ''),
	('00000000-0000-0000-0000-000000000000', '8a4733a6-db03-4fc4-8dc0-cb749ad0d689', '{"action":"token_refreshed","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 17:32:16.629548+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd3cfdffa-e49a-44a3-9089-0bd32d6e1358', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 18:19:13.354722+00', ''),
	('00000000-0000-0000-0000-000000000000', '7678ff25-f57b-4665-87ce-6651f0e9908c', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 18:19:13.356574+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e2ccd82b-048d-4e5e-81c4-6065f0d2c2f3', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 18:19:15.560281+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e6f147fc-6002-41f6-b5e0-5f2c795232fe', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 18:19:15.561442+00', ''),
	('00000000-0000-0000-0000-000000000000', '359918bf-eaea-4b87-a01b-88c086458c88', '{"action":"token_refreshed","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 18:33:08.498573+00', ''),
	('00000000-0000-0000-0000-000000000000', '21b6a294-b904-4d09-ac61-683da88d32b9', '{"action":"token_revoked","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 18:33:08.501397+00', ''),
	('00000000-0000-0000-0000-000000000000', 'daac41e8-99db-445f-9fea-e1188dea6adb', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 19:18:02.941171+00', ''),
	('00000000-0000-0000-0000-000000000000', '19a5df02-c2f9-4a54-9ab3-0d2c0231d44a', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-18 19:18:02.942751+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fbb3a8b0-8426-4723-8e95-583fdb8afbdb', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 03:18:34.655548+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e5e9533d-9a5c-49c7-be7d-1a8835d95993', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 03:18:34.656313+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a2f553c0-f1d7-4433-8dd9-0f2affd9f366', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 04:05:56.362073+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e6041af7-be1c-440a-b943-889d8dd75b69', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 04:05:56.362861+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c9d16c52-aa56-4b4c-8d93-c8f846f14e47', '{"action":"token_refreshed","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 04:12:19.78199+00', ''),
	('00000000-0000-0000-0000-000000000000', '128234da-9f16-4b8a-bad2-bc324365e7ef', '{"action":"token_revoked","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 04:12:19.782921+00', ''),
	('00000000-0000-0000-0000-000000000000', '6af095e7-fb90-4f6f-801d-3f424c18ce5f', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 04:39:40.170926+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ae95e86a-7bde-4648-be53-d0462f61bce4', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 04:39:40.17208+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bcbf6e6c-29a4-4591-8023-b3f2dbc7b7be', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 07:16:21.31111+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd164220a-222d-493d-9c17-b36fb40e65c3', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 07:16:21.312264+00', ''),
	('00000000-0000-0000-0000-000000000000', '7577528b-731c-4d2f-97d2-d6cabe8d9585', '{"action":"token_refreshed","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 07:29:43.182156+00', ''),
	('00000000-0000-0000-0000-000000000000', 'de5a312e-2199-4210-b745-b6380c9e7aa6', '{"action":"token_revoked","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 07:29:43.185746+00', ''),
	('00000000-0000-0000-0000-000000000000', '8dcdbd3c-1a4a-48ca-ba0b-4d4443bce3e4', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 05:04:34.730366+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e256a7cb-6915-4733-ae38-b58539d3a01f', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 05:04:34.732149+00', ''),
	('00000000-0000-0000-0000-000000000000', '91a28ac3-0df7-413e-8d4d-543e2495ebc5', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 06:10:55.763966+00', ''),
	('00000000-0000-0000-0000-000000000000', '497836a6-83bc-4cab-93db-7bf846f41a1d', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 06:10:55.764741+00', ''),
	('00000000-0000-0000-0000-000000000000', 'b66bd18d-9cbe-428f-91d4-97e437a1c33d', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 06:15:07.578948+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd5f160b0-41cc-4c90-bdac-11d7f5850540', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 06:15:07.579864+00', ''),
	('00000000-0000-0000-0000-000000000000', '142e05a1-d973-4952-8da2-6e428cc4ac93', '{"action":"token_refreshed","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 06:31:12.092061+00', ''),
	('00000000-0000-0000-0000-000000000000', '1e20b510-2ddf-479d-9018-9c5fff5a6d79', '{"action":"token_revoked","actor_id":"a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d","actor_name":"Fang Bunyasit","actor_username":"bysf168@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 06:31:12.093389+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ded5ec48-b775-48d5-88b8-525a2e94980b', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 07:32:38.379426+00', ''),
	('00000000-0000-0000-0000-000000000000', '4f42ba49-9439-4992-b078-d4deedafedb0', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 07:32:38.380856+00', ''),
	('00000000-0000-0000-0000-000000000000', '5a905fa5-5d2f-4209-8bb1-222a1a1200c8', '{"action":"token_refreshed","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 09:02:38.77928+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bd4385e1-6b2c-4dcf-8b8c-9fd373dc3b71', '{"action":"token_revoked","actor_id":"2c5333d9-797e-4cd6-a681-cb91f5a3efa8","actor_name":"xb1g","actor_username":"big168bk@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 09:02:38.780516+00', ''),
	('00000000-0000-0000-0000-000000000000', '2dc99155-069e-4d09-97cb-7c30f5ad33ad', '{"action":"token_refreshed","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 09:03:00.075816+00', ''),
	('00000000-0000-0000-0000-000000000000', '75fba65e-21da-4281-b419-4f4296726ca8', '{"action":"token_revoked","actor_id":"7c60c21b-2bcd-40ba-ab8f-469b3ce31dec","actor_name":"xb2g","actor_username":"wachaa1319@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-08-19 09:03:00.076622+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at") VALUES
	('7fad146e-ae31-4585-ae6d-ca6c65c8bbfd', NULL, 'c624c6c3-7d52-48ff-9f02-aeb68b7d918c', 's256', '0A4gHbGURsG2LNM6r539gqyv3OvQPmCYil4H0IAbDqg', 'discord', '', '', '2025-08-17 04:02:32.675706+00', '2025-08-17 04:02:32.675706+00', 'oauth', NULL),
	('3544facb-3504-4d55-b6f9-ea3f92d34892', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', '3031f248-05cd-40ec-8856-21e779089078', 's256', 'Z1ja81G8wCn2U3DomcyH_BRispAXwRYrm2wjtTuRpNA', 'magiclink', '', '', '2025-08-18 07:30:45.318224+00', '2025-08-18 07:30:45.318224+00', 'magiclink', NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', 'authenticated', 'authenticated', 'big168bk@gmail.com', NULL, '2025-08-17 12:18:40.44498+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-08-17 12:18:40.766087+00', '{"provider": "discord", "providers": ["discord"]}', '{"iss": "https://discord.com/api", "sub": "417624995770925077", "name": "xb1g#0", "email": "big168bk@gmail.com", "picture": "https://cdn.discordapp.com/avatars/417624995770925077/8a5cdee178327d692f5dc8efd4fc2d15.png", "full_name": "xb1g", "avatar_url": "https://cdn.discordapp.com/avatars/417624995770925077/8a5cdee178327d692f5dc8efd4fc2d15.png", "provider_id": "417624995770925077", "custom_claims": {"global_name": "big"}, "email_verified": true, "phone_verified": false}', NULL, '2025-08-17 12:18:40.428369+00', '2025-08-19 09:02:38.7826+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', 'authenticated', 'authenticated', 'wachaa1319@gmail.com', '$2a$10$9OJ8hm2Cet9zxxsasmA5qexCjjWdrpuQC7Kjyvo9kSrQ9dmTRBPPa', '2025-08-18 07:30:45.311878+00', NULL, '', NULL, 'pkce_1141b937ba6707b9b6e22baccfcae8a2020c1bcd01815ec8aff8380f', '2025-08-18 07:30:45.32095+00', '', '', NULL, '2025-08-18 15:35:06.427402+00', '{"provider": "email", "providers": ["email", "discord"]}', '{"iss": "https://discord.com/api", "sub": "422761721506037760", "name": "xb2g#0", "email": "wachaa1319@gmail.com", "picture": "https://cdn.discordapp.com/avatars/422761721506037760/c7912af423320fbf93314531390ae08f.png", "full_name": "xb2g", "avatar_url": "https://cdn.discordapp.com/avatars/422761721506037760/c7912af423320fbf93314531390ae08f.png", "provider_id": "422761721506037760", "custom_claims": {"global_name": "b2g"}, "email_verified": true, "phone_verified": false}', NULL, '2025-08-18 07:30:45.307928+00', '2025-08-19 09:03:00.079603+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'authenticated', 'authenticated', 'bysf168@gmail.com', NULL, '2025-08-18 15:52:38.410198+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-08-18 15:52:38.707163+00', '{"provider": "google", "providers": ["google"]}', '{"iss": "https://accounts.google.com", "sub": "106421644493825443519", "name": "Fang Bunyasit", "email": "bysf168@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJlKiCyr5fJvOoJraX28GJ2rky19MYq94eE0WFymrCT4r2ZcFA=s96-c", "full_name": "Fang Bunyasit", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJlKiCyr5fJvOoJraX28GJ2rky19MYq94eE0WFymrCT4r2ZcFA=s96-c", "provider_id": "106421644493825443519", "email_verified": true, "phone_verified": false}', NULL, '2025-08-18 15:52:38.394502+00', '2025-08-19 07:29:43.191805+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '66e5df28-a702-480d-b4ba-4f77cfc60581', 'authenticated', 'authenticated', 'bysfang@gmail.com', '$2a$10$7tL7j75Y83IZLp8zavKf9.XmxQBhFFKqHgK1HW/Z2rBeAHj8s3Up.', '2025-08-18 14:04:22.19594+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-08-18 15:31:15.576654+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "66e5df28-a702-480d-b4ba-4f77cfc60581", "email": "bysfang@gmail.com", "email_verified": true, "phone_verified": false}', NULL, '2025-08-18 14:04:22.192677+00', '2025-08-18 15:31:15.578086+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false),
	('00000000-0000-0000-0000-000000000000', '241aa8b2-498f-4efb-99bd-7320e950e01f', 'authenticated', 'authenticated', 'sb@gg.gg', '$2a$10$U.u.wYJFqDDDePqGBJBNQe..IIYfxFCGI/wIKIE2eO9/ur8UBoLnO', '2025-08-18 07:33:58.823986+00', NULL, '', NULL, '', NULL, '', '', NULL, '2025-08-18 07:33:58.825596+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "241aa8b2-498f-4efb-99bd-7320e950e01f", "email": "sb@gg.gg", "email_verified": true, "phone_verified": false}', NULL, '2025-08-18 07:33:58.820216+00', '2025-08-18 07:33:58.82661+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('417624995770925077', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', '{"iss": "https://discord.com/api", "sub": "417624995770925077", "name": "xb1g#0", "email": "big168bk@gmail.com", "picture": "https://cdn.discordapp.com/avatars/417624995770925077/8a5cdee178327d692f5dc8efd4fc2d15.png", "full_name": "xb1g", "avatar_url": "https://cdn.discordapp.com/avatars/417624995770925077/8a5cdee178327d692f5dc8efd4fc2d15.png", "provider_id": "417624995770925077", "custom_claims": {"global_name": "big"}, "email_verified": true, "phone_verified": false}', 'discord', '2025-08-17 12:18:40.440521+00', '2025-08-17 12:18:40.440557+00', '2025-08-17 12:18:40.440557+00', 'dde60b38-28bf-4fe1-9c3a-4b1b7f673bc8'),
	('7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', '{"sub": "7c60c21b-2bcd-40ba-ab8f-469b3ce31dec", "email": "wachaa1319@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-08-18 07:30:45.310035+00', '2025-08-18 07:30:45.310053+00', '2025-08-18 07:30:45.310053+00', '53ac4cc7-959c-4506-a722-ff685f3a5e21'),
	('241aa8b2-498f-4efb-99bd-7320e950e01f', '241aa8b2-498f-4efb-99bd-7320e950e01f', '{"sub": "241aa8b2-498f-4efb-99bd-7320e950e01f", "email": "sb@gg.gg", "email_verified": false, "phone_verified": false}', 'email', '2025-08-18 07:33:58.822413+00', '2025-08-18 07:33:58.82244+00', '2025-08-18 07:33:58.82244+00', 'ac879c34-2772-4152-a4a9-e09b3c53ad70'),
	('66e5df28-a702-480d-b4ba-4f77cfc60581', '66e5df28-a702-480d-b4ba-4f77cfc60581', '{"sub": "66e5df28-a702-480d-b4ba-4f77cfc60581", "email": "bysfang@gmail.com", "email_verified": false, "phone_verified": false}', 'email', '2025-08-18 14:04:22.194303+00', '2025-08-18 14:04:22.194328+00', '2025-08-18 14:04:22.194328+00', '8d2430f8-63fb-4b32-bee9-6678302caf15'),
	('422761721506037760', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', '{"iss": "https://discord.com/api", "sub": "422761721506037760", "name": "xb2g#0", "email": "wachaa1319@gmail.com", "picture": "https://cdn.discordapp.com/avatars/422761721506037760/c7912af423320fbf93314531390ae08f.png", "full_name": "xb2g", "avatar_url": "https://cdn.discordapp.com/avatars/422761721506037760/c7912af423320fbf93314531390ae08f.png", "provider_id": "422761721506037760", "custom_claims": {"global_name": "b2g"}, "email_verified": true, "phone_verified": false}', 'discord', '2025-08-18 07:36:22.933116+00', '2025-08-18 07:36:22.933191+00', '2025-08-18 15:35:06.258474+00', '4d574c7d-55c1-4ebe-b304-c840bdad1ba5'),
	('106421644493825443519', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', '{"iss": "https://accounts.google.com", "sub": "106421644493825443519", "name": "Fang Bunyasit", "email": "bysf168@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocJlKiCyr5fJvOoJraX28GJ2rky19MYq94eE0WFymrCT4r2ZcFA=s96-c", "full_name": "Fang Bunyasit", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocJlKiCyr5fJvOoJraX28GJ2rky19MYq94eE0WFymrCT4r2ZcFA=s96-c", "provider_id": "106421644493825443519", "email_verified": true, "phone_verified": false}', 'google', '2025-08-18 15:52:38.404063+00', '2025-08-18 15:52:38.404109+00', '2025-08-18 15:52:38.404109+00', '51f90ac1-6bf0-4d1b-9dd8-c8708b4cbed5');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") VALUES
	('4de52b75-dc50-456e-9250-c5bdfce39fa2', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', '2025-08-18 15:52:38.70758+00', '2025-08-19 07:29:43.194806+00', NULL, 'aal1', NULL, '2025-08-19 07:29:43.194653', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '192.168.65.1', NULL),
	('28f9de33-e6a6-4fed-8b42-19bd511387b5', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', '2025-08-17 12:18:40.766216+00', '2025-08-19 09:02:38.783662+00', NULL, 'aal1', NULL, '2025-08-19 09:02:38.783624', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '192.168.65.1', NULL),
	('de7e1416-9eac-43e1-abae-2b265f263836', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', '2025-08-18 15:35:06.427452+00', '2025-08-19 09:03:00.080859+00', NULL, 'aal1', NULL, '2025-08-19 09:03:00.080793', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '192.168.65.1', NULL),
	('7f6e15dd-3e68-4feb-8ee3-f06f6f1f7d1a', '66e5df28-a702-480d-b4ba-4f77cfc60581', '2025-08-18 15:31:15.576713+00', '2025-08-18 15:31:15.576713+00', NULL, 'aal1', NULL, NULL, 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '192.168.65.1', NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('28f9de33-e6a6-4fed-8b42-19bd511387b5', '2025-08-17 12:18:40.77697+00', '2025-08-17 12:18:40.77697+00', 'oauth', 'bceeb829-d366-4235-98d9-cd0325e0e1ec'),
	('7f6e15dd-3e68-4feb-8ee3-f06f6f1f7d1a', '2025-08-18 15:31:15.578314+00', '2025-08-18 15:31:15.578314+00', 'password', '4e923b1f-061c-4ecc-aaee-39cb2791c450'),
	('de7e1416-9eac-43e1-abae-2b265f263836', '2025-08-18 15:35:06.428899+00', '2025-08-18 15:35:06.428899+00', 'oauth', '99d78679-79ca-49d8-a13f-66fd6d115d61'),
	('4de52b75-dc50-456e-9250-c5bdfce39fa2', '2025-08-18 15:52:38.723228+00', '2025-08-18 15:52:38.723228+00', 'oauth', '137db26a-1673-4506-9041-264670f587c4');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") VALUES
	('05a5544a-75f5-4fa4-832a-3cd669e70f85', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', 'recovery_token', 'pkce_1141b937ba6707b9b6e22baccfcae8a2020c1bcd01815ec8aff8380f', 'wachaa1319@gmail.com', '2025-08-18 07:30:45.341416', '2025-08-18 07:30:45.341416');


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 1, 'gh2x2dd462z3', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-17 12:18:40.768431+00', '2025-08-17 13:18:29.229379+00', NULL, '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 2, 'geex2z5tae23', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-17 13:18:29.230195+00', '2025-08-17 14:17:05.826795+00', 'gh2x2dd462z3', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 3, 'n36omuwnnrio', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-17 14:17:05.827732+00', '2025-08-18 05:20:08.125561+00', 'geex2z5tae23', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 4, 'g7jizsp3acft', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-18 05:20:08.125992+00', '2025-08-18 06:30:01.469701+00', 'n36omuwnnrio', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 5, 'npc5qt3mvqij', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-18 06:30:01.470161+00', '2025-08-18 07:34:05.164473+00', 'g7jizsp3acft', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 8, 'y4ijpeeboiua', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-18 07:34:05.164853+00', '2025-08-18 14:03:47.552633+00', 'npc5qt3mvqij', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 10, 'ngtis63bzuuk', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-18 14:03:47.553159+00', '2025-08-18 15:10:39.169797+00', 'y4ijpeeboiua', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 15, 'i5zu33jbzm3n', '66e5df28-a702-480d-b4ba-4f77cfc60581', false, '2025-08-18 15:31:15.577407+00', '2025-08-18 15:31:15.577407+00', NULL, '7f6e15dd-3e68-4feb-8ee3-f06f6f1f7d1a'),
	('00000000-0000-0000-0000-000000000000', 14, 'wog6lmya6ar2', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-18 15:10:39.171413+00', '2025-08-18 16:13:13.113414+00', 'ngtis63bzuuk', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 16, 'an77nqafh7tl', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', true, '2025-08-18 15:35:06.427988+00', '2025-08-18 17:08:26.035984+00', NULL, 'de7e1416-9eac-43e1-abae-2b265f263836'),
	('00000000-0000-0000-0000-000000000000', 18, 'a86FbxBZFtv-i69vWQTrhg', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-18 16:13:13.114202+00', '2025-08-18 17:14:52.7636+00', 'wog6lmya6ar2', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 17, '290gP8D9usgIyeQMaMjFOw', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', true, '2025-08-18 15:52:38.711032+00', '2025-08-18 17:32:16.586247+00', NULL, '4de52b75-dc50-456e-9250-c5bdfce39fa2'),
	('00000000-0000-0000-0000-000000000000', 20, 'WKElft6veXoWZbHQtSzfQQ', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-18 17:14:52.764083+00', '2025-08-18 18:19:13.357744+00', 'a86FbxBZFtv-i69vWQTrhg', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 19, 'Wg2ZEDOkiuvPPRaj1Of7ag', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', true, '2025-08-18 17:08:26.038098+00', '2025-08-18 18:19:15.561757+00', 'an77nqafh7tl', 'de7e1416-9eac-43e1-abae-2b265f263836'),
	('00000000-0000-0000-0000-000000000000', 21, 'o1-RscxwHDEnhcYOB5JeQw', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', true, '2025-08-18 17:32:16.587089+00', '2025-08-18 18:33:08.502182+00', '290gP8D9usgIyeQMaMjFOw', '4de52b75-dc50-456e-9250-c5bdfce39fa2'),
	('00000000-0000-0000-0000-000000000000', 23, 'KUZyKRel2ZYXLVBjiOL7qg', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', true, '2025-08-18 18:19:15.561973+00', '2025-08-18 19:18:02.943636+00', 'Wg2ZEDOkiuvPPRaj1Of7ag', 'de7e1416-9eac-43e1-abae-2b265f263836'),
	('00000000-0000-0000-0000-000000000000', 25, 'lDXn4QWCBYCkBPyfLdrP_Q', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', true, '2025-08-18 19:18:02.945878+00', '2025-08-19 03:18:34.656522+00', 'KUZyKRel2ZYXLVBjiOL7qg', 'de7e1416-9eac-43e1-abae-2b265f263836'),
	('00000000-0000-0000-0000-000000000000', 22, 'Bg0zgCyrjKPBMew6Jr50hw', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-18 18:19:13.359096+00', '2025-08-19 04:05:56.363288+00', 'WKElft6veXoWZbHQtSzfQQ', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 24, 'XbNkJCcAWnmsgtF5_-05lA', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', true, '2025-08-18 18:33:08.504659+00', '2025-08-19 04:12:19.783997+00', 'o1-RscxwHDEnhcYOB5JeQw', '4de52b75-dc50-456e-9250-c5bdfce39fa2'),
	('00000000-0000-0000-0000-000000000000', 26, 'NRzPSMQXcErrWvFpxNUzfg', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', true, '2025-08-19 03:18:34.65703+00', '2025-08-19 04:39:40.17255+00', 'lDXn4QWCBYCkBPyfLdrP_Q', 'de7e1416-9eac-43e1-abae-2b265f263836'),
	('00000000-0000-0000-0000-000000000000', 27, 'jZLXAF0EumupzvA4Trxw9g', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-19 04:05:56.363893+00', '2025-08-19 05:04:34.73266+00', 'Bg0zgCyrjKPBMew6Jr50hw', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 30, 'DIR2ivq3SWZR-LYqEWEgSg', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-19 05:04:34.733526+00', '2025-08-19 06:10:55.76496+00', 'jZLXAF0EumupzvA4Trxw9g', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 29, 'FWTOrQ9JnYrQ0UQL74oasQ', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', true, '2025-08-19 04:39:40.173206+00', '2025-08-19 06:15:07.580204+00', 'NRzPSMQXcErrWvFpxNUzfg', 'de7e1416-9eac-43e1-abae-2b265f263836'),
	('00000000-0000-0000-0000-000000000000', 28, 'GJm0py8oyhn7azLLiBts7g', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', true, '2025-08-19 04:12:19.784583+00', '2025-08-19 06:31:12.093744+00', 'XbNkJCcAWnmsgtF5_-05lA', '4de52b75-dc50-456e-9250-c5bdfce39fa2'),
	('00000000-0000-0000-0000-000000000000', 31, '14PDYKkk7h2QwICUG0fZdA', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-19 06:10:55.765418+00', '2025-08-19 07:16:21.312869+00', 'DIR2ivq3SWZR-LYqEWEgSg', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 33, 'j3kPjUegnWgYOjHMGBSGcQ', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', true, '2025-08-19 06:31:12.094353+00', '2025-08-19 07:29:43.186873+00', 'GJm0py8oyhn7azLLiBts7g', '4de52b75-dc50-456e-9250-c5bdfce39fa2'),
	('00000000-0000-0000-0000-000000000000', 35, 'tBji_L_u-AjagFJ2x4HoUA', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', false, '2025-08-19 07:29:43.188046+00', '2025-08-19 07:29:43.188046+00', 'j3kPjUegnWgYOjHMGBSGcQ', '4de52b75-dc50-456e-9250-c5bdfce39fa2'),
	('00000000-0000-0000-0000-000000000000', 32, 'OHe04wqh98bvO0nOR9a6Jw', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', true, '2025-08-19 06:15:07.580837+00', '2025-08-19 07:32:38.381226+00', 'FWTOrQ9JnYrQ0UQL74oasQ', 'de7e1416-9eac-43e1-abae-2b265f263836'),
	('00000000-0000-0000-0000-000000000000', 34, 'zC-a3a7nt8gkLHwPXdqXqQ', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', true, '2025-08-19 07:16:21.313551+00', '2025-08-19 09:02:38.781015+00', '14PDYKkk7h2QwICUG0fZdA', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 37, 'Eo4LuBbo2x4dF2vP5slWYQ', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', false, '2025-08-19 09:02:38.781859+00', '2025-08-19 09:02:38.781859+00', 'zC-a3a7nt8gkLHwPXdqXqQ', '28f9de33-e6a6-4fed-8b42-19bd511387b5'),
	('00000000-0000-0000-0000-000000000000', 36, 'eeH80TfCckItW5aYp1fctg', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', true, '2025-08-19 07:32:38.3818+00', '2025-08-19 09:03:00.077685+00', 'OHe04wqh98bvO0nOR9a6Jw', 'de7e1416-9eac-43e1-abae-2b265f263836'),
	('00000000-0000-0000-0000-000000000000', 38, 'z9L_7oOW4YadmeLWV6uw_w', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', false, '2025-08-19 09:03:00.078248+00', '2025-08-19 09:03:00.078248+00', 'eeH80TfCckItW5aYp1fctg', 'de7e1416-9eac-43e1-abae-2b265f263836');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "username", "avatar_url", "created_at", "updated_at", "discord_id", "email", "date_of_birth", "full_name") VALUES
	('2c5333d9-797e-4cd6-a681-cb91f5a3efa8', 'xbg', 'https://cdn.discordapp.com/avatars/417624995770925077/8a5cdee178327d692f5dc8efd4fc2d15.png', '2025-08-17 12:19:08.382762+00', '2025-08-17 12:19:08.373+00', NULL, 'big168bk@gmail.com', '2025-07-28', 'bs'),
	('7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', 'asdf', 'https://cdn.discordapp.com/avatars/422761721506037760/c7912af423320fbf93314531390ae08f.png', '2025-08-18 07:36:30.862062+00', '2025-08-18 07:36:30.858+00', NULL, 'wachaa1319@gmail.com', '2025-07-29', 'asda'),
	('a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'big', 'https://lh3.googleusercontent.com/a/ACg8ocJlKiCyr5fJvOoJraX28GJ2rky19MYq94eE0WFymrCT4r2ZcFA=s96-c', '2025-08-18 15:52:45.275653+00', '2025-08-18 15:52:45.266+00', NULL, 'bysf168@gmail.com', '2025-07-27', 'big');


--
-- Data for Name: learning_maps; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."learning_maps" ("id", "title", "description", "creator_id", "created_at", "updated_at", "difficulty", "category", "total_students", "finished_students", "metadata", "version", "last_modified_by") VALUES
	('ba0090d1-115a-4a59-8917-36a0c1aaebd0', 'test', 'tets', NULL, '2025-08-17 03:56:39.507472+00', '2025-08-17 03:56:39.507472+00', 1, NULL, 0, 0, '{}', 1, NULL),
	('c8026a16-3d4a-4534-9320-5ed5657a4b67', 'า่ทา', 'าททานา', NULL, '2025-08-17 12:37:44.953072+00', '2025-08-17 12:37:44.953072+00', 1, NULL, 0, 0, '{}', 1, NULL),
	('b4888c9e-c8fc-4a74-901e-65e9bd64d385', 'าทาทส', 'นาททาน', NULL, '2025-08-17 12:38:45.492081+00', '2025-08-17 12:38:45.492081+00', 1, NULL, 0, 0, '{}', 1, NULL),
	('0476b7b6-4c8c-41ad-a4e0-86f4225e0bc2', 'bro', 'gor', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', '2025-08-17 13:55:20.580649+00', '2025-08-17 13:55:20.580649+00', 1, NULL, 0, 0, '{}', 1, NULL);


--
-- Data for Name: map_nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."map_nodes" ("id", "map_id", "title", "instructions", "difficulty", "sprite_url", "metadata", "created_at", "updated_at", "node_type", "version", "last_modified_by") VALUES
	('fbee80ff-5643-481e-9a89-125126e4a4bc', 'ba0090d1-115a-4a59-8917-36a0c1aaebd0', 'New Node', 'Add instructions...', 1, NULL, '{"temp_id": "temp_node_1755403000604_0.155543413579325", "position": {"x": 532.5, "y": 510}}', '2025-08-17 03:56:56.204812+00', '2025-08-17 03:56:56.204812+00', NULL, 1, NULL),
	('a48d71f8-f8eb-4d3a-a1db-d54ddc40ae50', 'ba0090d1-115a-4a59-8917-36a0c1aaebd0', 'brodsfadsofasd', NULL, 1, NULL, '{"temp_id": "temp_text_1755403001296_0.4793245014876698", "fontSize": "16px", "position": {"x": 560, "y": 400}, "textAlign": "center", "textColor": "#f6f7f9", "fontWeight": "normal", "backgroundColor": "#e84545"}', '2025-08-17 03:56:56.204812+00', '2025-08-17 03:56:56.204812+00', 'text', 1, NULL),
	('b4a9e258-98f8-4aa7-8107-5f58bf4c2f12', 'c8026a16-3d4a-4534-9320-5ed5657a4b67', '้ร่ร่ร', NULL, 1, NULL, '{"temp_id": "temp_text_1755434274851_0.49555731341374365", "fontSize": "32px", "position": {"x": 653, "y": 514}, "textAlign": "left", "textColor": "#e0ecff", "fontWeight": "300", "backgroundColor": "#dc2e2e"}', '2025-08-17 12:38:12.742135+00', '2025-08-17 12:38:12.742135+00', 'text', 1, NULL),
	('32bed981-175a-43c1-a5ea-febd4a5baee1', 'c8026a16-3d4a-4534-9320-5ed5657a4b67', 'New Node', 'Add instructions...', 1, NULL, '{"temp_id": "temp_node_1755434290416_0.08744262093065935", "position": {"x": 737, "y": 627.5}}', '2025-08-17 12:38:12.742135+00', '2025-08-17 12:38:12.742135+00', NULL, 1, NULL),
	('5106d9ac-2676-4a75-aa78-074feaa4fa3a', 'b4888c9e-c8fc-4a74-901e-65e9bd64d385', 'New Node', 'Add instructions...', 1, '/islands/desert/Desert04.png', '{"temp_id": "temp_node_1755434327185_0.7330146142158431", "position": {"x": 660, "y": 520}}', '2025-08-17 12:39:29.688959+00', '2025-08-17 12:39:29.688959+00', 'learning', 1, NULL),
	('450a99b1-d0cd-44d5-af29-833ba38084c1', '0476b7b6-4c8c-41ad-a4e0-86f4225e0bc2', 'god', 'Add instructions...', 1, NULL, '{"temp_id": "temp_node_1755438922348_0.3243411077151803", "position": {"x": 540, "y": 520}}', '2025-08-17 13:55:27.238565+00', '2025-08-17 13:55:27.238565+00', 'learning', 1, NULL);


--
-- Data for Name: node_assessments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: student_node_progress; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."student_node_progress" ("id", "user_id", "node_id", "status", "arrived_at", "started_at", "submitted_at") VALUES
	('c2e08860-9ac2-473d-affb-cb525a37f118', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', '32bed981-175a-43c1-a5ea-febd4a5baee1', 'in_progress', '2025-08-17 12:38:25.785+00', '2025-08-17 12:38:25.785+00', NULL);


--
-- Data for Name: assessment_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: classrooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."classrooms" ("id", "name", "description", "instructor_id", "join_code", "max_students", "is_active", "created_at", "updated_at") VALUES
	('982fc485-d47f-4f0f-bb68-be372f0696f1', 'DB2', 'learn to build projects', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', '8RSDEB', 302, true, '2025-08-18 05:21:28.038083+00', '2025-08-18 05:21:28.038083+00');


--
-- Data for Name: classroom_assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: assignment_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: assignment_nodes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: passion_trees; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: classroom_maps; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."classroom_maps" ("id", "classroom_id", "map_id", "added_by", "added_at", "is_active", "display_order", "notes") VALUES
	('163be0dc-3aee-4868-9899-d94cbb3b92c3', '982fc485-d47f-4f0f-bb68-be372f0696f1', 'ba0090d1-115a-4a59-8917-36a0c1aaebd0', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', '2025-08-18 05:21:28.060152+00', true, 1, 'Linked during classroom creation');


--
-- Data for Name: classroom_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."classroom_memberships" ("id", "classroom_id", "user_id", "role", "joined_at", "last_active_at") VALUES
	('510d9324-0998-4fc0-9aa5-eeb789eb03d6', '982fc485-d47f-4f0f-bb68-be372f0696f1', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', 'instructor', '2025-08-18 05:21:28.048108+00', '2025-08-18 05:21:28.048108+00'),
	('62a71572-980f-4f8d-972f-2074593daaf3', '982fc485-d47f-4f0f-bb68-be372f0696f1', '66e5df28-a702-480d-b4ba-4f77cfc60581', 'student', '2025-08-18 14:37:41.608231+00', '2025-08-18 14:37:41.608231+00'),
	('0aed70a1-7fad-47e7-a727-7a45436aa15a', '982fc485-d47f-4f0f-bb68-be372f0696f1', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', 'student', '2025-08-18 15:35:18.114994+00', '2025-08-18 15:35:18.114994+00'),
	('7fd3e41d-e51c-4ab0-8fcd-9ed20f3e48f5', '982fc485-d47f-4f0f-bb68-be372f0696f1', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'student', '2025-08-18 15:52:59.331941+00', '2025-08-18 15:52:59.331941+00');


--
-- Data for Name: classroom_teams; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."classroom_teams" ("id", "classroom_id", "name", "description", "created_by", "created_at", "is_active", "max_members", "team_metadata") VALUES
	('b2bc7b61-44dc-422c-8cd5-b4ec9f9badfa', '982fc485-d47f-4f0f-bb68-be372f0696f1', 'Gay', 'gays', '66e5df28-a702-480d-b4ba-4f77cfc60581', '2025-08-18 15:03:51.066446+00', true, 6, '{"color": "#ec4899", "goals": "Eat gay food", "skills": ["Backend Development", "DevOps"], "communication_platform": "", "preferred_meeting_times": []}'),
	('88464e4d-1c7b-4a5b-8347-31b6f0c933ed', '982fc485-d47f-4f0f-bb68-be372f0696f1', 'Gay', 'gays', '66e5df28-a702-480d-b4ba-4f77cfc60581', '2025-08-18 15:06:49.832816+00', true, 6, '{"color": "#ec4899", "goals": "Eat gay food", "skills": ["Backend Development", "DevOps"], "communication_platform": "", "preferred_meeting_times": []}'),
	('55b4d2fd-1db5-46c5-a352-4ec83e590b19', '982fc485-d47f-4f0f-bb68-be372f0696f1', 'bro', 'man', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', '2025-08-18 15:35:33.936718+00', true, 6, '{"color": "#10b981", "goals": "build god shit", "skills": ["Backend Development", "DevOps", "UI/UX Design", "Quality Assurance", "Database Design"], "communication_platform": "", "preferred_meeting_times": []}');


--
-- Data for Name: classroom_team_maps; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cohorts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: cohort_map_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: communities; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: community_images; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: community_mentors; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: community_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: community_projects; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: connections; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: emotions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: engagement; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: impacts; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: influences; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: insights; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: interests; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."interests" ("id", "user_id", "name", "level", "created_at", "updated_at", "emotion", "type") VALUES
	('09e17e54-2619-47a7-b3a7-a5ffd6e04ab3', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', 'game making', 3, '2025-08-17 12:20:11.221+00', '2025-08-17 12:20:11.265273+00', 'joy', 'career'),
	('707582bb-8e44-4d7b-8538-7a28b298eb51', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', 'sdf', 1, '2025-08-18 07:36:33.925+00', '2025-08-18 07:36:33.945152+00', 'joy', 'hobby'),
	('6522a65a-6624-4338-861d-a0d6660e6c82', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'asdfasdfa', 4, '2025-08-18 15:52:48.657+00', '2025-08-18 15:52:48.690396+00', 'joy', 'hobby');


--
-- Data for Name: learning_paths; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: milestones; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: monthly_insights; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: node_content; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: node_leaderboard; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: node_paths; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: post_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: post_likes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: post_media; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: potential_offshoots; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: project_outcomes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: project_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: quiz_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: reflections; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: reflection_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: related_interests; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: resources; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: roots; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: skills; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: submission_grades; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: synergies; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: team_memberships; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."team_memberships" ("id", "team_id", "user_id", "role", "joined_at", "left_at", "is_leader", "member_metadata") VALUES
	('6b927ab4-b769-4cd4-ab57-2441bf1f79c2', '88464e4d-1c7b-4a5b-8347-31b6f0c933ed', '66e5df28-a702-480d-b4ba-4f77cfc60581', 'leader', '2025-08-18 15:06:49.841179+00', NULL, true, NULL),
	('c7930ee4-cd62-4a61-9aed-7671a24cea18', '55b4d2fd-1db5-46c5-a352-4ec83e590b19', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 15:53:04.604021+00', '2025-08-18 17:32:22.635+00', false, NULL),
	('6c50bfee-037d-4324-b7da-379f1f067ea6', '55b4d2fd-1db5-46c5-a352-4ec83e590b19', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 17:32:26.156725+00', '2025-08-18 18:08:40.538+00', false, NULL),
	('617d59ae-4e4a-4455-ace4-d94ba66bc634', '88464e4d-1c7b-4a5b-8347-31b6f0c933ed', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 18:08:41.899785+00', '2025-08-18 18:08:47.527+00', false, NULL),
	('cb38ddf7-1de9-4b91-aae0-949aaede97d4', '55b4d2fd-1db5-46c5-a352-4ec83e590b19', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 18:08:48.973773+00', '2025-08-18 18:08:52.723+00', false, NULL),
	('fad21a35-b153-4d39-a34d-098cb31fbdbe', '88464e4d-1c7b-4a5b-8347-31b6f0c933ed', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 18:18:44.566906+00', '2025-08-18 18:18:45.85+00', false, NULL),
	('8b7647ef-33e3-4ca0-93ea-a7121b3b7d73', '88464e4d-1c7b-4a5b-8347-31b6f0c933ed', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 18:18:47.509444+00', '2025-08-18 18:18:50.678+00', false, NULL),
	('a2c1ceea-c934-42f9-a0ff-bbe4a58075a3', '88464e4d-1c7b-4a5b-8347-31b6f0c933ed', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 18:18:54.214579+00', '2025-08-18 18:19:05.686+00', false, NULL),
	('5a50685f-7fb4-44c0-b407-15a4bde96c23', '55b4d2fd-1db5-46c5-a352-4ec83e590b19', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 18:19:07.370246+00', '2025-08-18 18:37:25.287+00', false, NULL),
	('04873f3c-83e9-4da7-a048-51a62fc76936', '55b4d2fd-1db5-46c5-a352-4ec83e590b19', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-18 18:37:28.69392+00', '2025-08-19 07:35:22.503+00', false, NULL),
	('b4f1c4e3-cca6-418c-8390-c9a722c3c60b', '88464e4d-1c7b-4a5b-8347-31b6f0c933ed', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-19 07:35:23.90892+00', '2025-08-19 07:35:36.992+00', false, NULL),
	('6fa99599-3938-41ef-ba16-d1f59e57ad76', '88464e4d-1c7b-4a5b-8347-31b6f0c933ed', 'a7df0e8e-cdf4-47e2-9f0c-4695a4d6765d', 'member', '2025-08-19 07:35:38.773645+00', NULL, false, NULL),
	('0b9bee94-06fe-4cc4-9102-980d197dc436', '55b4d2fd-1db5-46c5-a352-4ec83e590b19', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', 'leader', '2025-08-18 15:35:33.94614+00', NULL, true, NULL);


--
-- Data for Name: tools_acquired; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_communities; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_map_enrollments; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_map_enrollments" ("id", "user_id", "map_id", "enrolled_at", "completed_at", "progress_percentage", "status") VALUES
	('23976c11-8050-4659-b9e6-203883a34f76', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', '0476b7b6-4c8c-41ad-a4e0-86f4225e0bc2', '2025-08-17 14:07:33.073+00', NULL, 0, 'active'),
	('f1ee80f6-9bb6-4821-9c0b-cce9147716d8', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', 'c8026a16-3d4a-4534-9320-5ed5657a4b67', '2025-08-17 14:15:45.914+00', NULL, 0, 'active'),
	('02a40342-d18c-430c-b39e-cc91a00d61eb', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', 'ba0090d1-115a-4a59-8917-36a0c1aaebd0', '2025-08-17 14:15:55.031+00', NULL, 0, 'active'),
	('1f2052f2-c594-4ef2-940e-e65b99f3282c', '2c5333d9-797e-4cd6-a681-cb91f5a3efa8', 'b4888c9e-c8fc-4a74-901e-65e9bd64d385', '2025-08-17 14:16:10.179+00', NULL, 0, 'active'),
	('60aee2b5-750c-4040-a880-b696e2fd5838', '7c60c21b-2bcd-40ba-ab8f-469b3ce31dec', 'ba0090d1-115a-4a59-8917-36a0c1aaebd0', '2025-08-19 07:40:58.673+00', NULL, 0, 'active');


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_stats; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: workshops; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: user_workshops; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: workshop_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: workshop_suggestions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: workshop_votes; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_namespaces; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: iceberg_tables; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: prefixes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: hooks; Type: TABLE DATA; Schema: supabase_functions; Owner: supabase_functions_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 38, true);


--
-- Name: hooks_id_seq; Type: SEQUENCE SET; Schema: supabase_functions; Owner: supabase_functions_admin
--

SELECT pg_catalog.setval('"supabase_functions"."hooks_id_seq"', 1, false);


--
-- PostgreSQL database dump complete
--

RESET ALL;
