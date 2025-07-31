export const generateTempId = (prefix: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `${prefix}_${timestamp}_${random}`;
};

export const getRandomPosition = () => ({
  x: Math.random() * 400,
  y: Math.random() * 400,
});

// ADDED: Helper to create predictable temp ID for mapping
export const createPredictableTempId = (
  prefix: string,
  identifier: string,
  index: number
): string => {
  return `${prefix}_${identifier.replace(/\s+/g, "_")}_${index}`;
};

// ADDED: Helper to extract components from temp ID
export const parseTempId = (
  tempId: string
): { prefix: string; timestamp?: string; random?: string } => {
  const parts = tempId.split("_");
  return {
    prefix: parts[0] + "_" + parts[1], // e.g., "temp_node"
    timestamp: parts[2],
    random: parts[3],
  };
};
