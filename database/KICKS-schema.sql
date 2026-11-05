-- KICKS · SQL Server
-- Generated from database-data.js. Execute in a NEW, empty database.
-- No DROP, no seeded users, no card data. Authorization rules are documented separately.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET ARITHABORT ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
BEGIN TRY
BEGIN TRANSACTION;

-- Accounts, hashed credentials, signup approval and assigned roles.
CREATE TABLE [dbo].[users] (
    [id] int IDENTITY(1,1) NOT NULL,
    [full_name] nvarchar(100) NOT NULL,
    [email] nvarchar(254) NOT NULL,
    [password_hash] varchar(512) NOT NULL,
    [password_salt] varchar(128) NOT NULL,
    [password_algorithm] varchar(40) NOT NULL DEFAULT ('PBKDF2-SHA256'),
    [password_iterations] int NOT NULL DEFAULT (100000),
    [role] varchar(24) NOT NULL DEFAULT ('player'),
    [status] varchar(24) NOT NULL DEFAULT ('Pending'),
    [requested_role] varchar(24) NULL,
    [reviewed_by] int NULL,
    [reviewed_at] datetimeoffset(0) NULL,
    [city] nvarchar(100) NULL,
    [phone] nvarchar(30) NULL,
    [address] nvarchar(300) NULL,
    [avatar_url] nvarchar(max) NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_users] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_users_email] UNIQUE ([email]),
    CONSTRAINT [CK_users_password_iterations] CHECK ([password_iterations] >= 100000),
    CONSTRAINT [CK_users_role_enum] CHECK ([role] IN (N'player', N'owner', N'admin')),
    CONSTRAINT [CK_users_status_enum] CHECK ([status] IN (N'Pending', N'Active', N'Rejected', N'Inactive')),
    CONSTRAINT [CK_users_requested_role_enum] CHECK ([requested_role] IN (N'player', N'owner')),
    CONSTRAINT [FK_users_reviewed_by_0] FOREIGN KEY ([reviewed_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_users_0] ON [dbo].[users] ([reviewed_by]);

-- Ownership evidence submitted for administrator review.
CREATE TABLE [dbo].[ownership_documents] (
    [id] int IDENTITY(1,1) NOT NULL,
    [user_id] int NOT NULL,
    [file_name] nvarchar(200) NOT NULL,
    [storage_url] nvarchar(1000) NOT NULL,
    [mime_type] varchar(80) NOT NULL,
    [byte_size] int NOT NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_ownership_documents] PRIMARY KEY ([id]),
    CONSTRAINT [CK_ownership_documents_byte_size] CHECK ([byte_size] BETWEEN 1 AND 1048576),
    CONSTRAINT [FK_ownership_documents_user_id_0] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_ownership_documents_0] ON [dbo].[ownership_documents] ([user_id]);

-- Owned pitches with offline-resolved location precision.
CREATE TABLE [dbo].[fields] (
    [id] int IDENTITY(1,1) NOT NULL,
    [owner_id] int NOT NULL,
    [name] nvarchar(120) NOT NULL,
    [city] nvarchar(100) NOT NULL,
    [area] nvarchar(120) NOT NULL,
    [description] nvarchar(max) NOT NULL,
    [format] varchar(24) NOT NULL DEFAULT ('5v5'),
    [hourly_price] decimal(12,2) NOT NULL,
    [rating] decimal(3,2) NOT NULL DEFAULT (0),
    [latitude] decimal(9,6) NULL,
    [longitude] decimal(9,6) NULL,
    [location_precision] varchar(24) NOT NULL DEFAULT ('unknown'),
    [is_archived] bit NOT NULL DEFAULT (0),
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_fields] PRIMARY KEY ([id]),
    CONSTRAINT [CK_fields_format_enum] CHECK ([format] IN (N'5v5', N'6v6', N'7v7')),
    CONSTRAINT [CK_fields_hourly_price] CHECK ([hourly_price] >= 0),
    CONSTRAINT [CK_fields_rating] CHECK ([rating] BETWEEN 0 AND 5),
    CONSTRAINT [CK_fields_latitude] CHECK ([latitude] BETWEEN -90 AND 90),
    CONSTRAINT [CK_fields_longitude] CHECK ([longitude] BETWEEN -180 AND 180),
    CONSTRAINT [CK_fields_location_precision_enum] CHECK ([location_precision] IN (N'exact', N'area', N'city', N'unknown')),
    CONSTRAINT [FK_fields_owner_id_0] FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_fields_0] ON [dbo].[fields] ([owner_id]);

-- Image URLs and ordering for each pitch.
CREATE TABLE [dbo].[field_images] (
    [id] int IDENTITY(1,1) NOT NULL,
    [field_id] int NOT NULL,
    [storage_url] nvarchar(1000) NOT NULL,
    [sort_order] int NOT NULL DEFAULT (0),
    CONSTRAINT [PK_field_images] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_field_images_field_id_sort_order] UNIQUE ([field_id], [sort_order]),
    CONSTRAINT [CK_field_images_sort_order] CHECK ([sort_order] >= 0),
    CONSTRAINT [FK_field_images_field_id_0] FOREIGN KEY ([field_id]) REFERENCES [dbo].[fields] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_field_images_0] ON [dbo].[field_images] ([field_id]);

-- Reusable venue facilities such as parking and floodlights.
CREATE TABLE [dbo].[amenities] (
    [id] int IDENTITY(1,1) NOT NULL,
    [name] nvarchar(80) NOT NULL,
    CONSTRAINT [PK_amenities] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_amenities_name] UNIQUE ([name])
);


-- Facilities available at each venue.
CREATE TABLE [dbo].[field_amenities] (
    [field_id] int NOT NULL,
    [amenity_id] int NOT NULL,
    CONSTRAINT [PK_field_amenities] PRIMARY KEY ([field_id], [amenity_id]),
    CONSTRAINT [FK_field_amenities_field_id_0] FOREIGN KEY ([field_id]) REFERENCES [dbo].[fields] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_field_amenities_amenity_id_1] FOREIGN KEY ([amenity_id]) REFERENCES [dbo].[amenities] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_field_amenities_0] ON [dbo].[field_amenities] ([field_id]);
CREATE INDEX [IX_field_amenities_1] ON [dbo].[field_amenities] ([amenity_id]);

-- Permanent squads; the creator is their captain.
CREATE TABLE [dbo].[teams] (
    [id] int IDENTITY(1,1) NOT NULL,
    [captain_id] int NOT NULL,
    [name] nvarchar(36) NOT NULL,
    [city] nvarchar(100) NOT NULL,
    [area] nvarchar(120) NOT NULL,
    [level] varchar(24) NOT NULL DEFAULT ('Intermediate'),
    [format] varchar(24) NOT NULL DEFAULT ('5v5'),
    [capacity] int NOT NULL DEFAULT (12),
    [bio] nvarchar(360) NOT NULL,
    [usual_matchday] nvarchar(100) NOT NULL,
    [initials] nvarchar(3) NOT NULL,
    [badge_url] nvarchar(1000) NULL,
    [color] varchar(20) NOT NULL DEFAULT ('forest'),
    [is_recruiting] bit NOT NULL DEFAULT (1),
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_teams] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_teams_captain_id] UNIQUE ([captain_id]),
    CONSTRAINT [UQ_teams_name] UNIQUE ([name]),
    CONSTRAINT [CK_teams_level_enum] CHECK ([level] IN (N'Casual', N'Intermediate', N'Competitive')),
    CONSTRAINT [CK_teams_format_enum] CHECK ([format] IN (N'5v5', N'6v6', N'7v7')),
    CONSTRAINT [CK_teams_capacity] CHECK ([capacity] BETWEEN 5 AND 30),
    CONSTRAINT [FK_teams_captain_id_0] FOREIGN KEY ([captain_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);


-- Current roster; a player can belong to one permanent squad.
CREATE TABLE [dbo].[team_members] (
    [user_id] int NOT NULL,
    [team_id] int NOT NULL,
    [position] varchar(24) NOT NULL DEFAULT ('Midfielder'),
    [joined_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_team_members] PRIMARY KEY ([user_id]),
    CONSTRAINT [CK_team_members_position_enum] CHECK ([position] IN (N'Goalkeeper', N'Defender', N'Midfielder', N'Forward')),
    CONSTRAINT [FK_team_members_user_id_0] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_team_members_team_id_1] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_team_members_0] ON [dbo].[team_members] ([team_id]);

-- Positions a captain is currently recruiting; an empty set means all positions.
CREATE TABLE [dbo].[team_recruiting_positions] (
    [team_id] int NOT NULL,
    [position] varchar(24) NOT NULL,
    CONSTRAINT [PK_team_recruiting_positions] PRIMARY KEY ([team_id], [position]),
    CONSTRAINT [CK_team_recruiting_positions_position_enum] CHECK ([position] IN (N'Goalkeeper', N'Defender', N'Midfielder', N'Forward')),
    CONSTRAINT [FK_team_recruiting_positions_team_id_0] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_team_recruiting_positions_0] ON [dbo].[team_recruiting_positions] ([team_id]);

-- Join requests and captain-approved departure requests.
CREATE TABLE [dbo].[team_requests] (
    [id] int IDENTITY(1,1) NOT NULL,
    [team_id] int NOT NULL,
    [user_id] int NOT NULL,
    [request_type] varchar(24) NOT NULL DEFAULT ('join'),
    [status] varchar(24) NOT NULL DEFAULT ('Pending'),
    [position] varchar(24) NOT NULL DEFAULT ('Midfielder'),
    [message] nvarchar(300) NULL,
    [reviewed_by] int NULL,
    [reviewed_at] datetimeoffset(0) NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_team_requests] PRIMARY KEY ([id]),
    CONSTRAINT [CK_team_requests_request_type_enum] CHECK ([request_type] IN (N'join', N'leave')),
    CONSTRAINT [CK_team_requests_status_enum] CHECK ([status] IN (N'Pending', N'Accepted', N'Declined', N'Cancelled')),
    CONSTRAINT [CK_team_requests_position_enum] CHECK ([position] IN (N'Goalkeeper', N'Defender', N'Midfielder', N'Forward')),
    CONSTRAINT [FK_team_requests_team_id_0] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_team_requests_user_id_1] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_team_requests_reviewed_by_2] FOREIGN KEY ([reviewed_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX [IX_team_requests_0] ON [dbo].[team_requests] ([team_id], [user_id], [request_type]) WHERE [status] = 'Pending';
CREATE INDEX [IX_team_requests_1] ON [dbo].[team_requests] ([user_id]);
CREATE INDEX [IX_team_requests_2] ON [dbo].[team_requests] ([reviewed_by]);

-- Admin-created competition; cancellation retains its entries, draw and receipts.
CREATE TABLE [dbo].[tournaments] (
    [id] int IDENTITY(1,1) NOT NULL,
    [created_by] int NOT NULL,
    [field_id] int NOT NULL,
    [name] nvarchar(120) NOT NULL,
    [starts_at] datetimeoffset(0) NOT NULL,
    [duration_minutes] int NOT NULL,
    [ends_at] AS (DATEADD(MINUTE, [duration_minutes], [starts_at])) PERSISTED,
    [capacity] int NOT NULL,
    [entry_fee] decimal(12,2) NOT NULL,
    [prize] nvarchar(200) NOT NULL,
    [system] varchar(24) NOT NULL DEFAULT ('Single elimination'),
    [level] nvarchar(40) NOT NULL,
    [draw_started_at] datetimeoffset(0) NULL,
    [status] varchar(24) NOT NULL DEFAULT ('Scheduled'),
    [cancelled_by] int NULL,
    [cancelled_at] datetimeoffset(0) NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_tournaments] PRIMARY KEY ([id]),
    CONSTRAINT [CK_tournaments_duration_minutes] CHECK ([duration_minutes] > 0),
    CONSTRAINT [CK_tournaments_capacity] CHECK ([capacity] BETWEEN 2 AND 64),
    CONSTRAINT [CK_tournaments_entry_fee] CHECK ([entry_fee] >= 0),
    CONSTRAINT [CK_tournaments_system_enum] CHECK ([system] IN (N'Single elimination', N'Group stage + knockout')),
    CONSTRAINT [CK_tournaments_status_enum] CHECK ([status] IN (N'Scheduled', N'Cancelled')),
    CONSTRAINT [CK_tournaments_rule_1] CHECK ([status] <> 'Cancelled' OR ([cancelled_by] IS NOT NULL AND [cancelled_at] IS NOT NULL)),
    CONSTRAINT [FK_tournaments_created_by_0] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournaments_field_id_1] FOREIGN KEY ([field_id]) REFERENCES [dbo].[fields] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournaments_cancelled_by_2] FOREIGN KEY ([cancelled_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_tournaments_0] ON [dbo].[tournaments] ([created_by]);
CREATE INDEX [IX_tournaments_1] ON [dbo].[tournaments] ([field_id]);
CREATE INDEX [IX_tournaments_2] ON [dbo].[tournaments] ([cancelled_by]);

-- Team entries; one entry per squad and captain in each tournament.
CREATE TABLE [dbo].[tournament_registrations] (
    [id] int IDENTITY(1,1) NOT NULL,
    [tournament_id] int NOT NULL,
    [team_id] int NOT NULL,
    [captain_id] int NOT NULL,
    [team_name_snapshot] nvarchar(100) NOT NULL,
    [captain_name_snapshot] nvarchar(100) NOT NULL,
    [email_snapshot] nvarchar(254) NOT NULL,
    [status] varchar(24) NOT NULL DEFAULT ('Registered'),
    [withdrawn_at] datetimeoffset(0) NULL,
    [withdrawn_by] int NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_tournament_registrations] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_tournament_registrations_tournament_id_team_id] UNIQUE ([tournament_id], [team_id]),
    CONSTRAINT [UQ_tournament_registrations_tournament_id_captain_id] UNIQUE ([tournament_id], [captain_id]),
    CONSTRAINT [UQ_tournament_registrations_tournament_id_id] UNIQUE ([tournament_id], [id]),
    CONSTRAINT [CK_tournament_registrations_status_enum] CHECK ([status] IN (N'Registered', N'Withdrawn')),
    CONSTRAINT [FK_tournament_registrations_tournament_id_0] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_registrations_team_id_1] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_registrations_captain_id_2] FOREIGN KEY ([captain_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_registrations_withdrawn_by_3] FOREIGN KEY ([withdrawn_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_tournament_registrations_0] ON [dbo].[tournament_registrations] ([tournament_id]);
CREATE INDEX [IX_tournament_registrations_1] ON [dbo].[tournament_registrations] ([team_id]);
CREATE INDEX [IX_tournament_registrations_2] ON [dbo].[tournament_registrations] ([captain_id]);
CREATE INDEX [IX_tournament_registrations_3] ON [dbo].[tournament_registrations] ([withdrawn_by]);

-- Frozen tournament roster, independent of future permanent team changes.
CREATE TABLE [dbo].[registration_players] (
    [registration_id] int NOT NULL,
    [user_id] int NOT NULL,
    [name_snapshot] nvarchar(100) NOT NULL,
    [position] varchar(24) NOT NULL DEFAULT ('Midfielder'),
    CONSTRAINT [PK_registration_players] PRIMARY KEY ([registration_id], [user_id]),
    CONSTRAINT [CK_registration_players_position_enum] CHECK ([position] IN (N'Goalkeeper', N'Defender', N'Midfielder', N'Forward')),
    CONSTRAINT [FK_registration_players_registration_id_0] FOREIGN KEY ([registration_id]) REFERENCES [dbo].[tournament_registrations] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_registration_players_user_id_1] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_registration_players_0] ON [dbo].[registration_players] ([registration_id]);
CREATE INDEX [IX_registration_players_1] ON [dbo].[registration_players] ([user_id]);

-- Saved first-round draw positions; empty places are automatic byes.
CREATE TABLE [dbo].[tournament_draw_entries] (
    [registration_id] int NOT NULL,
    [tournament_id] int NOT NULL,
    [seed_position] int NOT NULL,
    CONSTRAINT [PK_tournament_draw_entries] PRIMARY KEY ([registration_id]),
    CONSTRAINT [UQ_tournament_draw_entries_tournament_id_seed_position] UNIQUE ([tournament_id], [seed_position]),
    CONSTRAINT [CK_tournament_draw_entries_seed_position] CHECK ([seed_position] BETWEEN 1 AND 64),
    CONSTRAINT [FK_tournament_draw_entries_registration_id_0] FOREIGN KEY ([registration_id]) REFERENCES [dbo].[tournament_registrations] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_draw_entries_tournament_id_1] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_draw_entries_tournament_id_registration_id_2] FOREIGN KEY ([tournament_id], [registration_id]) REFERENCES [dbo].[tournament_registrations] ([tournament_id], [id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_tournament_draw_entries_0] ON [dbo].[tournament_draw_entries] ([tournament_id]);

-- Manual knockout results and each match position in the tree.
CREATE TABLE [dbo].[tournament_matches] (
    [id] int IDENTITY(1,1) NOT NULL,
    [tournament_id] int NOT NULL,
    [round_number] int NOT NULL,
    [match_number] int NOT NULL,
    [winner_registration_id] int NULL,
    [is_bye] bit NOT NULL DEFAULT (0),
    [updated_by] int NULL,
    [updated_at] datetimeoffset(0) NULL,
    CONSTRAINT [PK_tournament_matches] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_tournament_matches_tournament_id_round_number_match_number] UNIQUE ([tournament_id], [round_number], [match_number]),
    CONSTRAINT [UQ_tournament_matches_tournament_id_id] UNIQUE ([tournament_id], [id]),
    CONSTRAINT [CK_tournament_matches_round_number] CHECK ([round_number] BETWEEN 1 AND 6),
    CONSTRAINT [CK_tournament_matches_match_number] CHECK ([match_number] BETWEEN 1 AND 32),
    CONSTRAINT [FK_tournament_matches_tournament_id_0] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_matches_winner_registration_id_1] FOREIGN KEY ([winner_registration_id]) REFERENCES [dbo].[tournament_registrations] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_matches_updated_by_2] FOREIGN KEY ([updated_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_matches_tournament_id_winner_registration_id_3] FOREIGN KEY ([tournament_id], [winner_registration_id]) REFERENCES [dbo].[tournament_registrations] ([tournament_id], [id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_tournament_matches_0] ON [dbo].[tournament_matches] ([tournament_id]);
CREATE INDEX [IX_tournament_matches_1] ON [dbo].[tournament_matches] ([winner_registration_id]);
CREATE INDEX [IX_tournament_matches_2] ON [dbo].[tournament_matches] ([updated_by]);

-- Two input places per match, filled by an entrant or a preceding winner.
CREATE TABLE [dbo].[tournament_match_slots] (
    [match_id] int NOT NULL,
    [slot_number] int NOT NULL,
    [tournament_id] int NOT NULL,
    [registration_id] int NULL,
    [source_match_id] int NULL,
    CONSTRAINT [PK_tournament_match_slots] PRIMARY KEY ([match_id], [slot_number]),
    CONSTRAINT [CK_tournament_match_slots_slot_number] CHECK ([slot_number] IN (1,2)),
    CONSTRAINT [CK_tournament_match_slots_rule_1] CHECK ([source_match_id] IS NULL OR [source_match_id] <> [match_id]),
    CONSTRAINT [FK_tournament_match_slots_match_id_0] FOREIGN KEY ([match_id]) REFERENCES [dbo].[tournament_matches] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_match_slots_tournament_id_1] FOREIGN KEY ([tournament_id]) REFERENCES [dbo].[tournaments] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_match_slots_registration_id_2] FOREIGN KEY ([registration_id]) REFERENCES [dbo].[tournament_registrations] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_match_slots_source_match_id_3] FOREIGN KEY ([source_match_id]) REFERENCES [dbo].[tournament_matches] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_match_slots_tournament_id_match_id_4] FOREIGN KEY ([tournament_id], [match_id]) REFERENCES [dbo].[tournament_matches] ([tournament_id], [id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_match_slots_tournament_id_registration_id_5] FOREIGN KEY ([tournament_id], [registration_id]) REFERENCES [dbo].[tournament_registrations] ([tournament_id], [id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_tournament_match_slots_tournament_id_source_match_id_6] FOREIGN KEY ([tournament_id], [source_match_id]) REFERENCES [dbo].[tournament_matches] ([tournament_id], [id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_tournament_match_slots_0] ON [dbo].[tournament_match_slots] ([match_id]);
CREATE INDEX [IX_tournament_match_slots_1] ON [dbo].[tournament_match_slots] ([tournament_id]);
CREATE INDEX [IX_tournament_match_slots_2] ON [dbo].[tournament_match_slots] ([registration_id]);
CREATE INDEX [IX_tournament_match_slots_3] ON [dbo].[tournament_match_slots] ([source_match_id]);

-- Individual-player matches with timed visibility and capacity.
CREATE TABLE [dbo].[open_games] (
    [id] int IDENTITY(1,1) NOT NULL,
    [organizer_id] int NOT NULL,
    [field_id] int NOT NULL,
    [title] nvarchar(120) NOT NULL,
    [starts_at] datetimeoffset(0) NOT NULL,
    [duration_minutes] int NOT NULL,
    [ends_at] AS (DATEADD(MINUTE, [duration_minutes], [starts_at])) PERSISTED,
    [capacity] int NOT NULL,
    [player_fee] decimal(12,2) NOT NULL,
    [level] nvarchar(40) NOT NULL,
    [status] varchar(24) NOT NULL DEFAULT ('Scheduled'),
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_open_games] PRIMARY KEY ([id]),
    CONSTRAINT [CK_open_games_duration_minutes] CHECK ([duration_minutes] > 0),
    CONSTRAINT [CK_open_games_capacity] CHECK ([capacity] >= 2),
    CONSTRAINT [CK_open_games_player_fee] CHECK ([player_fee] >= 0),
    CONSTRAINT [CK_open_games_status_enum] CHECK ([status] IN (N'Scheduled', N'Cancelled')),
    CONSTRAINT [FK_open_games_organizer_id_0] FOREIGN KEY ([organizer_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_open_games_field_id_1] FOREIGN KEY ([field_id]) REFERENCES [dbo].[fields] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_open_games_0] ON [dbo].[open_games] ([organizer_id]);
CREATE INDEX [IX_open_games_1] ON [dbo].[open_games] ([field_id]);

-- Player entries and chosen match positions.
CREATE TABLE [dbo].[game_participants] (
    [id] int IDENTITY(1,1) NOT NULL,
    [game_id] int NOT NULL,
    [user_id] int NOT NULL,
    [position] varchar(24) NOT NULL DEFAULT ('Midfielder'),
    [status] varchar(24) NOT NULL DEFAULT ('Joined'),
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_game_participants] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_game_participants_game_id_user_id] UNIQUE ([game_id], [user_id]),
    CONSTRAINT [CK_game_participants_position_enum] CHECK ([position] IN (N'Goalkeeper', N'Defender', N'Midfielder', N'Forward')),
    CONSTRAINT [CK_game_participants_status_enum] CHECK ([status] IN (N'Joined', N'Left')),
    CONSTRAINT [FK_game_participants_game_id_0] FOREIGN KEY ([game_id]) REFERENCES [dbo].[open_games] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_game_participants_user_id_1] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_game_participants_0] ON [dbo].[game_participants] ([game_id]);
CREATE INDEX [IX_game_participants_1] ON [dbo].[game_participants] ([user_id]);

-- Upfront pitch quotes and agreed half-each friendlies; legacy full-price agreements remain readable.
CREATE TABLE [dbo].[challenges] (
    [id] int IDENTITY(1,1) NOT NULL,
    [host_team_id] int NOT NULL,
    [opponent_team_id] int NULL,
    [posted_by] int NOT NULL,
    [field_id] int NULL,
    [city] nvarchar(100) NOT NULL,
    [format] varchar(24) NOT NULL DEFAULT ('5v5'),
    [level] nvarchar(40) NOT NULL,
    [starts_at] datetimeoffset(0) NOT NULL,
    [payment_mode] varchar(24) NOT NULL DEFAULT ('Split checkout'),
    [cost_agreement] varchar(24) NOT NULL DEFAULT ('Half each'),
    [quoted_price] decimal(12,2) NULL,
    [note] nvarchar(300) NULL,
    [status] varchar(24) NOT NULL DEFAULT ('Open'),
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_challenges] PRIMARY KEY ([id]),
    CONSTRAINT [CK_challenges_format_enum] CHECK ([format] IN (N'5v5', N'6v6', N'7v7')),
    CONSTRAINT [CK_challenges_payment_mode_enum] CHECK ([payment_mode] IN (N'Split checkout', N'Legacy full')),
    CONSTRAINT [CK_challenges_cost_agreement_enum] CHECK ([cost_agreement] IN (N'Half each', N'Host team pays', N'Visiting team pays')),
    CONSTRAINT [CK_challenges_quoted_price] CHECK ([quoted_price] >= 0),
    CONSTRAINT [CK_challenges_status_enum] CHECK ([status] IN (N'Open', N'Agreed', N'Awaiting payment', N'Booked', N'Expired', N'Cancelled')),
    CONSTRAINT [CK_challenges_rule_1] CHECK ([opponent_team_id] IS NULL OR [opponent_team_id] <> [host_team_id]),
    CONSTRAINT [CK_challenges_rule_2] CHECK ([payment_mode] <> 'Split checkout' OR ([field_id] IS NOT NULL AND [quoted_price] IS NOT NULL AND [cost_agreement] = 'Half each')),
    CONSTRAINT [FK_challenges_host_team_id_0] FOREIGN KEY ([host_team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_challenges_opponent_team_id_1] FOREIGN KEY ([opponent_team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_challenges_posted_by_2] FOREIGN KEY ([posted_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_challenges_field_id_3] FOREIGN KEY ([field_id]) REFERENCES [dbo].[fields] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_challenges_0] ON [dbo].[challenges] ([host_team_id]);
CREATE INDEX [IX_challenges_1] ON [dbo].[challenges] ([opponent_team_id]);
CREATE INDEX [IX_challenges_2] ON [dbo].[challenges] ([posted_by]);
CREATE INDEX [IX_challenges_3] ON [dbo].[challenges] ([field_id]);

-- Rival offers reviewed by the posting captain.
CREATE TABLE [dbo].[challenge_requests] (
    [id] int IDENTITY(1,1) NOT NULL,
    [challenge_id] int NOT NULL,
    [team_id] int NOT NULL,
    [status] varchar(24) NOT NULL DEFAULT ('Pending'),
    [note] nvarchar(300) NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_challenge_requests] PRIMARY KEY ([id]),
    CONSTRAINT [CK_challenge_requests_status_enum] CHECK ([status] IN (N'Pending', N'Accepted', N'Declined', N'Withdrawn')),
    CONSTRAINT [FK_challenge_requests_challenge_id_0] FOREIGN KEY ([challenge_id]) REFERENCES [dbo].[challenges] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_challenge_requests_team_id_1] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX [IX_challenge_requests_0] ON [dbo].[challenge_requests] ([challenge_id], [team_id]) WHERE [status] = 'Pending';
CREATE UNIQUE INDEX [IX_challenge_requests_1] ON [dbo].[challenge_requests] ([challenge_id]) WHERE [status] = 'Accepted';
CREATE INDEX [IX_challenge_requests_2] ON [dbo].[challenge_requests] ([team_id]);

-- One-hour reservations with frozen owner, price and split-payment deadlines.
CREATE TABLE [dbo].[bookings] (
    [id] int IDENTITY(1,1) NOT NULL,
    [field_id] int NOT NULL,
    [user_id] int NOT NULL,
    [owner_id] int NOT NULL,
    [challenge_id] int NULL,
    [starts_at] datetimeoffset(0) NOT NULL,
    [ends_at] AS (DATEADD(HOUR, 1, [starts_at])) PERSISTED,
    [price] decimal(12,2) NOT NULL,
    [commission_rate] decimal(5,2) NOT NULL,
    [commission] decimal(12,2) NOT NULL,
    [owner_net] decimal(12,2) NOT NULL,
    [is_split] bit NOT NULL DEFAULT (0),
    [payment_deadline] datetimeoffset(0) NULL,
    [status] varchar(24) NOT NULL DEFAULT ('Confirmed'),
    [cancellation_reason] varchar(24) NULL,
    [cancelled_by] int NULL,
    [cancelled_at] datetimeoffset(0) NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_bookings] PRIMARY KEY ([id]),
    CONSTRAINT [CK_bookings_starts_at] CHECK (DATEPART(MINUTE,[starts_at]) = 0 AND DATEPART(SECOND,[starts_at]) = 0),
    CONSTRAINT [CK_bookings_price] CHECK ([price] >= 0),
    CONSTRAINT [CK_bookings_commission_rate] CHECK ([commission_rate] BETWEEN 0 AND 100),
    CONSTRAINT [CK_bookings_commission] CHECK ([commission] >= 0),
    CONSTRAINT [CK_bookings_owner_net] CHECK ([owner_net] >= 0),
    CONSTRAINT [CK_bookings_status_enum] CHECK ([status] IN (N'Pending', N'Confirmed', N'Completed', N'Cancelled')),
    CONSTRAINT [CK_bookings_cancellation_reason_enum] CHECK ([cancellation_reason] IN (N'Cancelled', N'Expired')),
    CONSTRAINT [CK_bookings_rule_1] CHECK ([commission] + [owner_net] = [price]),
    CONSTRAINT [CK_bookings_rule_2] CHECK ([is_split] = 0 OR ([challenge_id] IS NOT NULL AND [payment_deadline] IS NOT NULL)),
    CONSTRAINT [CK_bookings_rule_3] CHECK ([payment_deadline] IS NULL OR [payment_deadline] <= [starts_at]),
    CONSTRAINT [CK_bookings_rule_4] CHECK (DATEPART(TZOFFSET,[starts_at]) = 180 AND DATEPART(HOUR,[starts_at]) BETWEEN 10 AND 22),
    CONSTRAINT [FK_bookings_field_id_0] FOREIGN KEY ([field_id]) REFERENCES [dbo].[fields] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_bookings_user_id_1] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_bookings_owner_id_2] FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_bookings_challenge_id_3] FOREIGN KEY ([challenge_id]) REFERENCES [dbo].[challenges] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_bookings_cancelled_by_4] FOREIGN KEY ([cancelled_by]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX [IX_bookings_0] ON [dbo].[bookings] ([field_id], [starts_at]) WHERE [status] IN ('Pending','Confirmed');
CREATE UNIQUE INDEX [IX_bookings_1] ON [dbo].[bookings] ([challenge_id]) WHERE [challenge_id] IS NOT NULL;
CREATE INDEX [IX_bookings_2] ON [dbo].[bookings] ([user_id]);
CREATE INDEX [IX_bookings_3] ON [dbo].[bookings] ([owner_id]);
CREATE INDEX [IX_bookings_4] ON [dbo].[bookings] ([cancelled_by]);

-- Both squads and immutable captain identities attached to an agreed friendly.
CREATE TABLE [dbo].[booking_teams] (
    [booking_id] int NOT NULL,
    [team_id] int NOT NULL,
    [captain_id] int NOT NULL,
    [team_name_snapshot] nvarchar(100) NOT NULL,
    CONSTRAINT [PK_booking_teams] PRIMARY KEY ([booking_id], [team_id]),
    CONSTRAINT [UQ_booking_teams_booking_id_team_id_captain_id] UNIQUE ([booking_id], [team_id], [captain_id]),
    CONSTRAINT [FK_booking_teams_booking_id_0] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_booking_teams_team_id_1] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_booking_teams_captain_id_2] FOREIGN KEY ([captain_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_booking_teams_0] ON [dbo].[booking_teams] ([booking_id]);
CREATE INDEX [IX_booking_teams_1] ON [dbo].[booking_teams] ([team_id]);
CREATE INDEX [IX_booking_teams_2] ON [dbo].[booking_teams] ([captain_id]);

-- Exactly priced captain shares; odd cents belong to the posting team.
CREATE TABLE [dbo].[booking_shares] (
    [id] int IDENTITY(1,1) NOT NULL,
    [booking_id] int NOT NULL,
    [team_id] int NOT NULL,
    [payer_id] int NOT NULL,
    [amount] decimal(12,2) NOT NULL,
    [commission] decimal(12,2) NOT NULL,
    [payment_state] varchar(24) NOT NULL DEFAULT ('Unpaid'),
    [paid_at] datetimeoffset(0) NULL,
    CONSTRAINT [PK_booking_shares] PRIMARY KEY ([id]),
    CONSTRAINT [UQ_booking_shares_booking_id_team_id] UNIQUE ([booking_id], [team_id]),
    CONSTRAINT [UQ_booking_shares_booking_id_payer_id] UNIQUE ([booking_id], [payer_id]),
    CONSTRAINT [CK_booking_shares_amount] CHECK ([amount] >= 0),
    CONSTRAINT [CK_booking_shares_commission] CHECK ([commission] >= 0),
    CONSTRAINT [CK_booking_shares_payment_state_enum] CHECK ([payment_state] IN (N'Unpaid', N'Held', N'Paid', N'Refunded')),
    CONSTRAINT [CK_booking_shares_rule_1] CHECK ([commission] <= [amount]),
    CONSTRAINT [FK_booking_shares_booking_id_0] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_booking_shares_team_id_1] FOREIGN KEY ([team_id]) REFERENCES [dbo].[teams] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_booking_shares_payer_id_2] FOREIGN KEY ([payer_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_booking_shares_booking_id_team_id_payer_id_3] FOREIGN KEY ([booking_id], [team_id], [payer_id]) REFERENCES [dbo].[booking_teams] ([booking_id], [team_id], [captain_id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_booking_shares_0] ON [dbo].[booking_shares] ([booking_id]);
CREATE INDEX [IX_booking_shares_1] ON [dbo].[booking_shares] ([team_id]);
CREATE INDEX [IX_booking_shares_2] ON [dbo].[booking_shares] ([payer_id]);

-- Receipt history: tournament fees belong entirely to the platform; split funds are held until both pay.
CREATE TABLE [dbo].[payments] (
    [id] int IDENTITY(1,1) NOT NULL,
    [payer_id] int NOT NULL,
    [platform_admin_id] int NOT NULL,
    [owner_id] int NULL,
    [field_id] int NULL,
    [booking_id] int NULL,
    [share_id] int NULL,
    [game_participant_id] int NULL,
    [registration_id] int NULL,
    [amount] decimal(12,2) NOT NULL,
    [commission_rate] decimal(5,2) NOT NULL,
    [commission] decimal(12,2) NOT NULL,
    [owner_net] decimal(12,2) NOT NULL,
    [status] varchar(24) NOT NULL DEFAULT ('Paid (demo)'),
    [is_demo] bit NOT NULL DEFAULT (1),
    [refunded_at] datetimeoffset(0) NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_payments] PRIMARY KEY ([id]),
    CONSTRAINT [CK_payments_amount] CHECK ([amount] >= 0),
    CONSTRAINT [CK_payments_commission_rate] CHECK ([commission_rate] BETWEEN 0 AND 100),
    CONSTRAINT [CK_payments_commission] CHECK ([commission] >= 0),
    CONSTRAINT [CK_payments_owner_net] CHECK ([owner_net] >= 0),
    CONSTRAINT [CK_payments_status_enum] CHECK ([status] IN (N'Held (demo)', N'Paid (demo)', N'Refunded (demo)')),
    CONSTRAINT [CK_payments_rule_1] CHECK ([amount] > 0),
    CONSTRAINT [CK_payments_rule_2] CHECK ([commission] + [owner_net] = [amount]),
    CONSTRAINT [CK_payments_rule_3] CHECK (CASE WHEN [field_id] IS NULL THEN 0 ELSE 1 END + CASE WHEN [booking_id] IS NULL THEN 0 ELSE 1 END + CASE WHEN [share_id] IS NULL THEN 0 ELSE 1 END + CASE WHEN [game_participant_id] IS NULL THEN 0 ELSE 1 END + CASE WHEN [registration_id] IS NULL THEN 0 ELSE 1 END = 1),
    CONSTRAINT [CK_payments_rule_4] CHECK ([registration_id] IS NULL OR ([commission_rate] = 100 AND [commission] = [amount] AND [owner_net] = 0 AND [owner_id] IS NULL)),
    CONSTRAINT [CK_payments_rule_5] CHECK ([status] <> 'Held (demo)' OR [share_id] IS NOT NULL),
    CONSTRAINT [FK_payments_payer_id_0] FOREIGN KEY ([payer_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_payments_platform_admin_id_1] FOREIGN KEY ([platform_admin_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_payments_owner_id_2] FOREIGN KEY ([owner_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_payments_field_id_3] FOREIGN KEY ([field_id]) REFERENCES [dbo].[fields] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_payments_booking_id_4] FOREIGN KEY ([booking_id]) REFERENCES [dbo].[bookings] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_payments_share_id_5] FOREIGN KEY ([share_id]) REFERENCES [dbo].[booking_shares] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_payments_game_participant_id_6] FOREIGN KEY ([game_participant_id]) REFERENCES [dbo].[game_participants] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_payments_registration_id_7] FOREIGN KEY ([registration_id]) REFERENCES [dbo].[tournament_registrations] ([id]) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX [IX_payments_0] ON [dbo].[payments] ([share_id]) WHERE [share_id] IS NOT NULL;
CREATE INDEX [IX_payments_1] ON [dbo].[payments] ([payer_id], [created_at]);
CREATE INDEX [IX_payments_2] ON [dbo].[payments] ([platform_admin_id], [status], [created_at]);
CREATE INDEX [IX_payments_3] ON [dbo].[payments] ([owner_id]);
CREATE INDEX [IX_payments_4] ON [dbo].[payments] ([field_id]);
CREATE INDEX [IX_payments_5] ON [dbo].[payments] ([booking_id]);
CREATE INDEX [IX_payments_6] ON [dbo].[payments] ([game_participant_id]);
CREATE INDEX [IX_payments_7] ON [dbo].[payments] ([registration_id]);

-- Private direct messages between eligible account relationships.
CREATE TABLE [dbo].[messages] (
    [id] int IDENTITY(1,1) NOT NULL,
    [sender_id] int NOT NULL,
    [recipient_id] int NOT NULL,
    [body] nvarchar(2000) NOT NULL,
    [read_at] datetimeoffset(0) NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_messages] PRIMARY KEY ([id]),
    CONSTRAINT [CK_messages_rule_1] CHECK ([sender_id] <> [recipient_id]),
    CONSTRAINT [FK_messages_sender_id_0] FOREIGN KEY ([sender_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_messages_recipient_id_1] FOREIGN KEY ([recipient_id]) REFERENCES [dbo].[users] ([id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_messages_0] ON [dbo].[messages] ([recipient_id], [created_at]);
CREATE INDEX [IX_messages_1] ON [dbo].[messages] ([sender_id]);

-- Visitor contact feedback and overall experience rating.
CREATE TABLE [dbo].[feedback] (
    [id] int IDENTITY(1,1) NOT NULL,
    [name] nvarchar(100) NOT NULL,
    [email] nvarchar(254) NOT NULL,
    [rating] int NOT NULL,
    [message] nvarchar(1500) NOT NULL,
    [created_at] datetimeoffset(0) NOT NULL DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT [PK_feedback] PRIMARY KEY ([id]),
    CONSTRAINT [CK_feedback_rating] CHECK ([rating] BETWEEN 1 AND 5)
);


-- Singleton website copy and default commission policy.
CREATE TABLE [dbo].[settings] (
    [id] int NOT NULL DEFAULT (1),
    [title] nvarchar(200) NOT NULL,
    [description] nvarchar(1000) NOT NULL,
    [contact] nvarchar(254) NULL,
    [city] nvarchar(100) NOT NULL,
    [commission_rate] decimal(5,2) NOT NULL DEFAULT (10),
    [listing_fee] decimal(12,2) NOT NULL DEFAULT (5),
    CONSTRAINT [PK_settings] PRIMARY KEY ([id]),
    CONSTRAINT [CK_settings_id] CHECK ([id] = 1),
    CONSTRAINT [CK_settings_commission_rate] CHECK ([commission_rate] BETWEEN 0 AND 100),
    CONSTRAINT [CK_settings_listing_fee] CHECK ([listing_fee] >= 0)
);


COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
