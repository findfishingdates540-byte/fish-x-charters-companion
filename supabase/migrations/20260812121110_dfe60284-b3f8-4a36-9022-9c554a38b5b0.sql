REVOKE ALL ON FUNCTION public.release_due_booking_payouts(integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_delivered_product_payouts(integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_due_booking_payouts(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_delivered_product_payouts(integer) TO service_role;
REVOKE ALL ON FUNCTION public.mark_product_order_delivered(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_product_order_delivered(uuid) TO authenticated, service_role;