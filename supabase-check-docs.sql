-- Check specialist document URLs
SELECT
  sp.id,
  sp.phone,
  sp.id_document_url,
  sp.csf_document_url,
  sp.address_proof_url,
  sp.profile_photo_url,
  p.first_name
FROM specialist_profiles sp
LEFT JOIN profiles p ON p.id = sp.user_id
LIMIT 10;
