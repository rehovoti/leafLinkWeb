CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    title VARCHAR(20),
    mac_address VARCHAR(17) NOT NULL UNIQUE,
    user_ref INTEGER NOT NULL,
    FOREIGN KEY (user_ref) REFERENCES users(id) ON DELETE CASCADE
);

--Daily rules:
--D05300045M25T1535
--Every day 5:00 for 00 minutes, 45 seconds, 
--Moisture threshold(min): 25%
--Temperature range(on): 15-35 deg

--Weekly rules:
--W105300045M25T1535108300045M25T153515300045M25T1535305300045M25T1535
--3 time slots on Sunday (05:30,08:30,15:30)
--1 time slot on Tuesday (05:30)

--Run now:
--R0045
--Turn on for 45 seconds

CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    channel_num INTEGER,
    title VARCHAR(50),
    run_now_duration INTEGER,
    scheduler_active BOOLEAN,
    rules VARCHAR(350),
    device_ref INTEGER,
    last_activated TIMESTAMP,
    last_duration INTEGER,
    s_temperature INTEGER,
    s_moisture INTEGER,
    FOREIGN KEY (device_ref) REFERENCES devices(id) ON DELETE CASCADE
);

--TRUNCATE TABLE channels CASCADE;

INSERT INTO users (name, email, password)
VALUES ('user1', 'user1@example.com', 'xxx');
INSERT INTO users (name, email, password)
VALUES ('user2', 'user2@example.com', 'yyy');
INSERT INTO users (name, email, password)
VALUES ('user3', 'user3@example.com', 'zzz');
