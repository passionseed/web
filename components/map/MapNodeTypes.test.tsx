import React from 'react';
import { render, screen } from '@testing-library/react';
import { MapNodeDefault, MapNodeData } from './MapNodeTypes';
import { ReactFlowProvider } from '@xyflow/react';

// Mock Lucide icons to avoid issues
jest.mock('lucide-react', () => ({
  CheckCircle: () => <div data-testid="icon-check" />,
  Clock: () => <div data-testid="icon-clock" />,
  AlertTriangle: () => <div data-testid="icon-alert" />,
  Play: () => <div data-testid="icon-play" />,
  Lock: () => <div data-testid="icon-lock" />,
}));

// Mock TextNode and CommentNode
jest.mock('@/components/map/MapEditor/components/TextNode', () => ({
    TextNode: () => <div data-testid="text-node" />
}));
jest.mock('@/components/map/CommentNode', () => ({
    CommentNode: () => <div data-testid="comment-node" />
}));

describe('MapNodeDefault', () => {
  const mockData: MapNodeData = {
    id: '1',
    map_id: 'map1',
    title: 'Test Node',
    instructions: 'Test instructions',
    difficulty: 1,
    sprite_url: null,
    metadata: {},
    created_at: '2023-01-01',
    updated_at: '2023-01-01',
    isUnlocked: true,
    progress: undefined
  };

  it('renders correctly when unlocked', () => {
    render(
      <ReactFlowProvider>
        <MapNodeDefault data={mockData} />
      </ReactFlowProvider>
    );
    expect(screen.getByText('Test Node')).toBeInTheDocument();
    // Should NOT have lock icon
    expect(screen.queryByTestId('icon-lock')).not.toBeInTheDocument();
  });

  it('renders lock when locked', () => {
    render(
      <ReactFlowProvider>
        <MapNodeDefault data={{ ...mockData, isUnlocked: false }} />
      </ReactFlowProvider>
    );
    expect(screen.getByText('Test Node')).toBeInTheDocument();
    expect(screen.getByTestId('icon-lock')).toBeInTheDocument();
  });
});
