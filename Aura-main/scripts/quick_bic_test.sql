-- Quick BIC Test Data
-- Add just the essential BIC responses for testing

INSERT INTO training_data (tenant_id, assistant_key, prompt, response, tags) VALUES
('00000000-0000-0000-0000-000000000001', 'bib-halder', 'What is BIC?', 
'BIC stands for Bibhrajit Investment Corporation. We are a company founded by Bibhrajit Halder that focuses on helping AI, robotics, autonomy, and defense tech startups raise capital and scale their companies.', 
'{"company", "overview", "bic"}'),

('00000000-0000-0000-0000-000000000001', 'bib-halder', 'What is Bibhrajit?', 
'Bibhrajit refers to Bibhrajit Investment Corporation (BIC), founded by Bibhrajit Halder. We specialize in helping AI, robotics, autonomy, and defense tech startups with franchising and scaling.', 
'{"company", "bibhrajit", "overview"}'),

('00000000-0000-0000-0000-000000000001', 'bib-halder', 'What services does BIC offer?', 
'BIC offers three core services: Pitch Deck Review & Redesign ($699), Fundraising Sprint ($1,699), and GTM Kickstart ($1,699). We help startups with fundraising, pitch decks, and go-to-market strategy.', 
'{"services", "offerings", "pricing"}');

-- Check what we now have
SELECT assistant_key, prompt, LEFT(response, 50) as response_preview 
FROM training_data 
WHERE assistant_key = 'bib-halder' 
ORDER BY created_at DESC;
