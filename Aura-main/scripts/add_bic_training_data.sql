-- Add BIC Training Data to the training_data table
-- This will make BIC information available to the AI system

-- Insert BIC Q&A pairs for bib-halder assistant
INSERT INTO training_data (tenant_id, assistant_key, prompt, response, tags) VALUES

-- Core Company Information
('00000000-0000-0000-0000-000000000001', 'bib-halder', 'What is BIC?', 
'BIC stands for Bibhrajit Investment Corporation. We are a company founded by Bibhrajit Halder that focuses on helping AI, robotics, autonomy, and defense tech startups raise capital and scale their companies. With 20+ years of experience in self-driving and autonomy, including founding and leading SafeAI as CEO, we provide hands-on, founder-friendly advisory services.', 
'["company", "overview", "bic"]'),

('00000000-0000-0000-0000-000000000001', 'bib-halder', 'What is Bibhrajit?', 
'Bibhrajit refers to Bibhrajit Investment Corporation (BIC), a company founded by Bibhrajit Halder. We specialize in helping AI, robotics, autonomy, and defense tech startups with fundraising and scaling. Our founder has 20+ years of experience in self-driving technology and previously founded and led SafeAI as CEO.', 
'["company", "bibhrajit", "overview"]'),

-- Services
('00000000-0000-0000-0000-000000000001', 'bib-halder', 'What services does BIC offer?', 
'BIC offers three core services: 1) Pitch Deck Review & Redesign ($699) - complete deck overhaul with strategic feedback and 1-hour session, 2) Fundraising Sprint ($1,699) - 2-week intensive program with 3 working sessions covering storyline, metrics, and investor intros, 3) GTM Kickstart ($1,699) - go-to-market strategy for technical founders including ICP definition and messaging refinement.', 
'["services", "offerings", "pricing"]'),

('00000000-0000-0000-0000-000000000001', 'bib-halder', 'How much do BIC services cost?', 
'Our pricing is simple: Pitch Deck Review & Redesign is $699, while both the Fundraising Sprint and GTM Kickstart are $1,699 each. These are one-time fees with no hidden costs - a fraction of what traditional consultants charge, and you work directly with people who have built and scaled startups.', 
'["pricing", "cost", "fees"]'),

-- Founder Background
('00000000-0000-0000-0000-000000000001', 'bib-halder', 'Who is Bibhrajit Halder?', 
'Bibhrajit Halder is the founder of BIC (Bibhrajit Investment Corporation). He has an engineering background with 20+ years of experience in self-driving and autonomy technology. He previously founded and led SafeAI as CEO and has worked with multiple autonomy startups. His specialties include self-driving technology, industrial automation, and mining and construction tech, with strong connections in Silicon Valley and defense tech.', 
'["founder", "background", "experience"]'),

-- Expertise
('00000000-0000-0000-0000-000000000001', 'bib-halder', 'What is BIC expertise in?', 
'BIC specializes in seven key areas: AI/ML product commercialization, robotics and autonomy go-to-market, enterprise B2B sales strategies, defense tech market entry, hardware-software integration, technical team scaling, and product-market fit for deep tech companies.', 
'["expertise", "specialization", "areas"]'),

-- Contact & Booking
('00000000-0000-0000-0000-000000000001', 'bib-halder', 'How do I contact BIC?', 
'You can reach BIC at info@bicorp.ai for general inquiries, or book directly at https://bicorp.ai/book-now to schedule a session. You can also visit our website at https://bicorp.ai for more information.', 
'["contact", "booking", "email"]'),

('00000000-0000-0000-0000-000000000001', 'bib-halder', 'How do I book a session with BIC?', 
'You can book directly at https://bicorp.ai/book-now. Pick the service that fits your needs and grab a time that works for you. We usually have slots available within the week. For questions before booking, you can email info@bicorp.ai.', 
'["booking", "scheduling", "sessions"]'),

-- Target Customers
('00000000-0000-0000-0000-000000000001', 'bib-halder', 'Who does BIC work with?', 
'BIC typically works with founders from pre-seed through Series A, especially in AI, robotics, and autonomy startups. Our Pitch Deck service is designed for pre-seed to Series A founders, Fundraising Sprint for founders actively raising, and GTM Kickstart for technical founders needing go-to-market help.', 
'["customers", "target", "startups"]'),

-- Process & Timeline  
('00000000-0000-0000-0000-000000000001', 'bib-halder', 'How long do BIC programs take?', 
'All BIC programs are designed to be fast and intensive. The Pitch Deck Review takes about 1 week turnaround, while both the Fundraising Sprint and GTM Kickstart run for 2 weeks. We start immediately after booking, work intensively together, and you walk away with tangible deliverables and clear next steps.', 
'["timeline", "process", "duration"]');

-- Verify the insertions
SELECT COUNT(*) as new_bic_records FROM training_data WHERE assistant_key = 'bib-halder' AND LOWER(response) LIKE '%bic%';
