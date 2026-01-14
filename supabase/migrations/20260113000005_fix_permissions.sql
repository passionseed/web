-- Grant permissions on map_nodes to service_role (vital for adminClient)
GRANT ALL ON TABLE "public"."map_nodes" TO "service_role";
GRANT SELECT ON TABLE "public"."map_nodes" TO "authenticated";
GRANT SELECT ON TABLE "public"."map_nodes" TO "anon";

-- Grant permissions on student_node_progress
GRANT ALL ON TABLE "public"."student_node_progress" TO "service_role";
GRANT ALL ON TABLE "public"."student_node_progress" TO "authenticated";

-- Grant permissions on other critical tables just in case
GRANT ALL ON TABLE "public"."assessment_submissions" TO "service_role";
GRANT ALL ON TABLE "public"."assessment_submissions" TO "authenticated";

GRANT ALL ON TABLE "public"."classroom_memberships" TO "service_role";
GRANT ALL ON TABLE "public"."classroom_memberships" TO "authenticated";

GRANT ALL ON TABLE "public"."profiles" TO "service_role";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";

-- Ensure sequences are accessible if any (for ID generation)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO "service_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "public" TO "authenticated";
