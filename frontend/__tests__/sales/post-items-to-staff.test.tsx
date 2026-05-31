import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ---------------------------------------------------------------------------
// Mock the api module BEFORE the component is imported.
// The component calls api.get('/api/sales/staff-list') etc.
// ---------------------------------------------------------------------------
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Mock the zustand auth store so the component doesn't hydrate from storage.
// ---------------------------------------------------------------------------
vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn((selector) => {
    const state = {
      user: {
        id: 'test-sales-id',
        email: 'sales@test.com',
        full_name: 'Test Sales',
        role: 'sales',
        store_location: 'Jalingo',
      },
      token: 'mock-token',
      isAuthenticated: true,
    };
    return selector ? selector(state) : state;
  }),
}));

// ---------------------------------------------------------------------------
// Mock Lucide icons to avoid SVG rendering issues in jsdom.
// ---------------------------------------------------------------------------
vi.mock('lucide-react', () => ({
  Send: () => React.createElement('span', { 'data-testid': 'icon-send' }, '[Send]'),
  Package: () => React.createElement('span', { 'data-testid': 'icon-package' }, '[Package]'),
  AlertCircle: () => React.createElement('span', { 'data-testid': 'icon-alert-circle' }, '[AlertCircle]'),
  CheckCircle: () => React.createElement('span', { 'data-testid': 'icon-check-circle' }, '[CheckCircle]'),
  Clock: () => React.createElement('span', { 'data-testid': 'icon-clock' }, '[Clock]'),
}));

import api from '@/lib/api';
import PostItemsPage from '@/app/sales/post-items-to-staff/page';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockApiGet = api.get as ReturnType<typeof vi.fn>;
const mockApiPost = api.post as ReturnType<typeof vi.fn>;

function createStaffListResponse(staffMembers: Array<{
  id: string;
  name: string;
  email: string;
  role: string;
  role_display: string;
}>) {
  return { data: staffMembers };
}

function createItemsResponse(items: Array<{
  id: string;
  name: string;
  sku: string;
  category: string;
  price_jalingo: number;
  unit_price: number;
  commission: number;
  active_store_quantity: number;
  main_store_quantity: number;
  quantity: number;
}>) {
  return { data: items };
}

function createPostedItemsResponse(posted: Array<any>) {
  return { data: posted };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('PostItemsPage — staff dropdown integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders staff names and role_display labels from the /api/sales/staff-list response', async () => {
    // Arrange: sales staff-list returns name + role_display (NOT full_name + role).
    // This test would FAIL if the component used staff.full_name / staff.role
    // because the mock data doesn't include those fields.
    const staffList = [
      { id: '1', name: 'Alice Ade', email: 'a@test.com', role: 'commission_staff', role_display: 'Commission Staff' },
      { id: '2', name: 'Bob Bello', email: 'b@test.com', role: 'non_commission_staff', role_display: 'Non-Commission Staff' },
    ];

    mockApiGet
      .mockResolvedValueOnce(createStaffListResponse(staffList))           // /api/sales/staff-list
      .mockResolvedValueOnce(createItemsResponse([]))                      // /api/sales/items/available
      .mockResolvedValueOnce(createPostedItemsResponse([]));               // /api/sales/posted-items

    // Act
    render(<PostItemsPage />);

    // Assert: wait for async data to load (dropdown appears)
    await waitFor(() => {
      expect(screen.getByText('Alice Ade (Commission Staff)')).toBeInTheDocument();
    });

    expect(screen.getByText('Bob Bello (Non-Commission Staff)')).toBeInTheDocument();

    // Verify the correct API endpoint was called
    expect(mockApiGet).toHaveBeenCalledWith('/api/sales/staff-list');
  });

  it('staff dropdown is interactive — selecting a staff member updates the value', async () => {
    const staffList = [
      { id: 's1', name: 'Chioma Chukwu', email: 'c@test.com', role: 'commission_staff', role_display: 'Commission Staff' },
    ];

    mockApiGet
      .mockResolvedValueOnce(createStaffListResponse(staffList))
      .mockResolvedValueOnce(createItemsResponse([]))
      .mockResolvedValueOnce(createPostedItemsResponse([]));

    render(<PostItemsPage />);

    // Wait for the dropdown option to appear
    await waitFor(() => {
      expect(screen.getByText('Chioma Chukwu (Commission Staff)')).toBeInTheDocument();
    });

    // The first combobox is the staff member select (no htmlFor linkage, so no accessible name)
    const select = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(select, 's1');

    expect((select as HTMLSelectElement).value).toBe('s1');
  });

  it('shows loading state initially', () => {
    // Arrange: never resolve the promises so loading stays
    mockApiGet.mockImplementation(() => new Promise(() => {}));

    render(<PostItemsPage />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
