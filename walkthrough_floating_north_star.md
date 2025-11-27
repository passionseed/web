# Floating North Star Implementation

I have implemented the "Floating North Star" design, transforming the North Star from a node on the map to a fixed, guiding element in the "sky".

## Changes

### 1. North Star Sky Overlay
- Created `components/journey/NorthStarSky.tsx`: A stunning, fixed overlay component that renders North Stars at the top of the screen.
- Features:
  - Gradient "sky" background.
  - Twinkling stars effect.
  - North Stars rendered as glowing icons (Star or Graduation Cap).
  - Hover effects for details and editing.

### 2. Journey Map Canvas Updates
- Modified `JourneyMapCanvasView.tsx` to include the `NorthStarSky` component.
- Updated `JourneyMapCanvas.tsx` to pass `northStars` data and callbacks to the view.

### 3. Node & Edge Logic
- Modified `utils/journeyMapBuilder.ts`:
  - **Removed**: North Star nodes are no longer created as ReactFlow nodes.
  - **Removed**: Edges connecting projects to North Stars are no longer created.
  - **Updated**: `createShortTermNode` now receives the full `NorthStar` object instead of just the title.
  - **Preserved**: The layout logic (`getNorthStarEntityPosition`) is kept to ensure projects are still positioned in a way that aligns with their North Star's "direction".

### 4. Project Node Visuals
- Updated `nodes/ShortTermProjectNode.tsx`:
  - Added a "Direction Beam" visual: A gradient beam extending upwards from the node, colored to match the linked North Star.
  - Added a pulsing dot indicator at the top of the beam.
  - Updated the progress bar to use the North Star object.

## Verification
- **Visuals**: You should see a beautiful sky overlay at the top of the journey map.
- **North Stars**: North Stars should appear in this sky, not as draggable nodes on the map.
- **Projects**: Projects linked to a North Star should have a subtle beam pointing upwards towards the sky.
- **Interaction**: Clicking a North Star in the sky should open its details (or trigger the view callback).
