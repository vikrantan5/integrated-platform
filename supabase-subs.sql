-- ================================================
-- SUPABASE SUBSCRIPTION SCHEMA
-- ================================================

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
    status TEXT NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    payment_id TEXT,
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create interview usage table to track free trial
CREATE TABLE IF NOT EXISTS public.interview_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    interview_count INTEGER NOT NULL DEFAULT 0,
    free_trial_used BOOLEAN NOT NULL DEFAULT FALSE,
    last_interview_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_end_date ON public.subscriptions(end_date);
CREATE INDEX IF NOT EXISTS idx_interview_usage_user_id ON public.interview_usage(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions table
-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
    FOR SELECT
    USING (user_id = auth.uid()::text);

-- Users can insert their own subscriptions
CREATE POLICY "Users can insert own subscriptions" ON public.subscriptions
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own subscriptions
CREATE POLICY "Users can update own subscriptions" ON public.subscriptions
    FOR UPDATE
    USING (user_id = auth.uid()::text);

-- Create policies for interview_usage table
-- Users can view their own interview usage
CREATE POLICY "Users can view own interview usage" ON public.interview_usage
    FOR SELECT
    USING (user_id = auth.uid()::text);

-- Users can insert their own interview usage
CREATE POLICY "Users can insert own interview usage" ON public.interview_usage
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

-- Users can update their own interview usage
CREATE POLICY "Users can update own interview usage" ON public.interview_usage
    FOR UPDATE
    USING (user_id = auth.uid()::text);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_interview_usage_updated_at BEFORE UPDATE ON public.interview_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE public.subscriptions IS 'Stores user subscription information for AI mock interviews';
COMMENT ON TABLE public.interview_usage IS 'Tracks interview usage and free trial status for users';

COMMENT ON COLUMN public.subscriptions.plan_type IS 'Subscription plan: monthly (₹500) or yearly (₹8000)';
COMMENT ON COLUMN public.subscriptions.status IS 'Subscription status: active, expired, or cancelled';
COMMENT ON COLUMN public.interview_usage.free_trial_used IS 'Whether user has used their one free interview';
