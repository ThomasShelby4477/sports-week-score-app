-- Seed data for Sports Week Score App (PostgreSQL)

-- Insert Departments
INSERT INTO departments (name, short_code) VALUES 
('BBA-MBA', 'BBA-MBA'),
('BBA-LLB', 'BBA-LLB'),
('BSc-MSc Forensic Sciences/BSc-MSc Criminology', 'BSc-MSc'),
('BTech-MTech', 'Btech-Mtech'),
('MSc Forensic Science/M.Phil Clinical Psychology/MSc Clinical Psychology/M.A. Criminology/LLM', 'PG')
ON CONFLICT (name) DO NOTHING;

-- Insert Sports - Day 1
INSERT INTO sports (name, day, icon, has_gender_categories, boys_only, girls_only) VALUES 
('Athletics', 1, '🏃', TRUE, FALSE, FALSE),
('Shotput', 1, '🏋️', TRUE, FALSE, FALSE),
('Discus Throw', 1, '🥏', TRUE, FALSE, FALSE),
('Javelin Throw', 1, '🎯', TRUE, FALSE, FALSE),
('Futsal', 1, '⚽', TRUE, FALSE, FALSE),
('Kho-Kho', 1, '🏃‍♀️', FALSE, FALSE, TRUE),
('Kabaddi', 1, '🤼', FALSE, TRUE, FALSE)
ON CONFLICT DO NOTHING;

-- Insert Sports - Day 2
INSERT INTO sports (name, day, icon, has_gender_categories, boys_only, girls_only) VALUES 
('Badminton', 2, '🏸', TRUE, FALSE, FALSE),
('Chess', 2, '♟️', TRUE, FALSE, FALSE),
('Carrom', 2, '🎱', TRUE, FALSE, FALSE),
('Volleyball', 2, '🏐', TRUE, FALSE, FALSE),
('Table Tennis', 2, '🏓', TRUE, FALSE, FALSE),
('Arm Wrestling', 2, '💪', TRUE, FALSE, FALSE),
('Esports', 2, '🎮', FALSE, FALSE, FALSE),
('Tug of War', 2, '🪢', TRUE, FALSE, FALSE)
ON CONFLICT DO NOTHING;

-- Insert Events for Athletics (100m, 400m, 1600m, 4x200 relay)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(1, '100m', 'boys', 'individual', 'upcoming'),
(1, '100m', 'girls', 'individual', 'upcoming'),
(1, '400m', 'boys', 'individual', 'upcoming'),
(1, '400m', 'girls', 'individual', 'upcoming'),
(1, '1600m', 'boys', 'individual', 'upcoming'),
(1, '1600m', 'girls', 'individual', 'upcoming'),
(1, '4x200 Relay', 'boys', 'team', 'upcoming'),
(1, '4x200 Relay', 'girls', 'team', 'upcoming');

-- Events for Shotput
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(2, 'Shotput', 'boys', 'individual', 'upcoming'),
(2, 'Shotput', 'girls', 'individual', 'upcoming');

-- Events for Discus Throw
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(3, 'Discus Throw', 'boys', 'individual', 'upcoming'),
(3, 'Discus Throw', 'girls', 'individual', 'upcoming');

-- Events for Javelin Throw
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(4, 'Javelin Throw', 'boys', 'individual', 'upcoming'),
(4, 'Javelin Throw', 'girls', 'individual', 'upcoming');

-- Events for Futsal
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(5, 'Futsal', 'boys', 'team', 'upcoming'),
(5, 'Futsal', 'girls', 'team', 'upcoming');

-- Events for Kho-Kho (Girls only)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(6, 'Kho-Kho', 'girls', 'team', 'upcoming');

-- Events for Kabaddi (Boys only)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(7, 'Kabaddi', 'boys', 'team', 'upcoming');

-- Events for Badminton (Doubles only)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(8, 'Badminton Doubles', 'boys', 'team', 'upcoming'),
(8, 'Badminton Doubles', 'girls', 'team', 'upcoming');

-- Events for Chess (Boys & Girls)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(9, 'Chess', 'boys', 'team', 'upcoming'),
(9, 'Chess', 'girls', 'team', 'upcoming');

-- Events for Carrom (Boys & Girls - Doubles)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(10, 'Carrom Doubles', 'boys', 'team', 'upcoming'),
(10, 'Carrom Doubles', 'girls', 'team', 'upcoming');

-- Events for Volleyball
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(11, 'Volleyball', 'boys', 'team', 'upcoming'),
(11, 'Volleyball', 'girls', 'team', 'upcoming');

-- Events for Table Tennis (Doubles only)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(12, 'Table Tennis Doubles', 'boys', 'team', 'upcoming'),
(12, 'Table Tennis Doubles', 'girls', 'team', 'upcoming');

-- Events for Arm Wrestling (Weight categories)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(13, 'Below 60kg', 'boys', 'individual', 'upcoming'),
(13, '60-70kg', 'boys', 'individual', 'upcoming'),
(13, '70-80kg', 'boys', 'individual', 'upcoming'),
(13, '80-90kg', 'boys', 'individual', 'upcoming'),
(13, 'Above 90kg', 'boys', 'individual', 'upcoming'),
(13, 'Below 60kg', 'girls', 'individual', 'upcoming'),
(13, '60-70kg', 'girls', 'individual', 'upcoming'),
(13, '70-80kg', 'girls', 'individual', 'upcoming'),
(13, '80-90kg', 'girls', 'individual', 'upcoming'),
(13, 'Above 90kg', 'girls', 'individual', 'upcoming');

-- Events for Esports (Valorant and BGMI - Mixed)
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(14, 'Valorant', 'mixed', 'team', 'upcoming'),
(14, 'BGMI', 'mixed', 'team', 'upcoming');

-- Events for Tug of War
INSERT INTO events (sport_id, name, category, event_type, status) VALUES 
(15, 'Tug of War', 'boys', 'team', 'upcoming'),
(15, 'Tug of War', 'girls', 'team', 'upcoming');
