import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { AdminLobbies } from './AdminLobbies';
import { createClient } from '@/utils/supabase/client';

// Mock the Supabase client
jest.mock('@/utils/supabase/client', () => ({
    createClient: jest.fn(),
}));

describe('AdminLobbies', () => {
    let mockSupabase: any;

    beforeEach(() => {
        jest.clearAllMocks();

        const mockLobbies = [
            {
                id: 'room-1',
                join_code: '1111',
                status: 'waiting',
                created_at: new Date().toISOString(),
                max_students: 50,
                // Simulated joined data
                members: Array(5).fill({ id: 'user-id' })
            },
            {
                id: 'room-2',
                join_code: '2222',
                status: 'waiting',
                created_at: new Date().toISOString(),
                max_students: 50,
                members: Array(5).fill({ id: 'user-id' })
            },
            {
                id: 'room-3',
                join_code: '3333',
                status: 'active',
                created_at: new Date().toISOString(),
                max_students: 50,
                members: Array(5).fill({ id: 'user-id' })
            },
        ];

        // Create a mock that allows chaining
        const mockOrder = jest.fn().mockResolvedValue({ data: mockLobbies, error: null });
        const mockIn = jest.fn().mockReturnValue({ order: mockOrder });

        // For the seed_rooms query
        const mockSelectRooms = jest.fn().mockReturnValue({ in: mockIn });

        // We don't expect specific calls to seed_room_members anymore for the counts
        // but we still mock the factory to be safe.
        const mockFrom = jest.fn().mockImplementation((table) => {
            if (table === 'seed_rooms') {
                return { select: mockSelectRooms };
            }
            return {
                select: jest.fn().mockReturnThis(),
                eq: jest.fn().mockReturnThis(),
                delete: jest.fn().mockReturnThis(),
                update: jest.fn().mockReturnThis(),
            };
        });

        mockSupabase = {
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
            },
            from: mockFrom,
        };

        (createClient as jest.Mock).mockReturnValue(mockSupabase);
    });

    test('fetches lobbies efficiently (single query)', async () => {
        render(<AdminLobbies isAdmin={true} />);

        // Open the dialog to trigger fetch
        const button = screen.getByText('View All Lobbies');
        fireEvent.click(button);

        // Wait for lobbies to load
        await waitFor(() => {
            expect(screen.getByText('1111')).toBeInTheDocument();
        });

        // Verify calls
        const fromCalls = (mockSupabase.from as jest.Mock).mock.calls;
        const seedRoomsCalls = fromCalls.filter(c => c[0] === 'seed_rooms').length;
        const seedRoomMembersCalls = fromCalls.filter(c => c[0] === 'seed_room_members').length;

        console.log('Calls to seed_rooms:', seedRoomsCalls);
        console.log('Calls to seed_room_members:', seedRoomMembersCalls);

        expect(seedRoomsCalls).toBeGreaterThanOrEqual(1);

        // The optimization should eliminate separate calls to seed_room_members for counts
        expect(seedRoomMembersCalls).toBe(0);

        // Verify that the count is displayed correctly
        // The component displays "5 / 50" (memberCount / max_students)
        // Since we have 3 rooms with 5 members each, we expect 3 occurrences of "5 / 50"
        const countElements = screen.getAllByText('5 / 50');
        expect(countElements.length).toBe(3);
    });
});
