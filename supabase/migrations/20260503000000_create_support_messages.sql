-- Create the support_messages table
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own support messages"
    ON support_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own support messages"
    ON support_messages FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view and update all messages
CREATE POLICY "Admins can view all support messages"
    ON support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update support messages"
    ON support_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create updated_at trigger
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON support_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
