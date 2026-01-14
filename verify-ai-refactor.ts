import { getModel } from "./lib/ai/modelRegistry";
import { summarizeConversation, conductDirectionConversation } from "./lib/ai/conversationEngine";
import { generateDirectionProfile } from "./lib/ai/directionProfileEngine";
import { recommendUniversities } from "./lib/ai/universityRecommender";

console.log("Verifying AI modules...");

if (typeof getModel === 'function' &&
    typeof summarizeConversation === 'function' &&
    typeof conductDirectionConversation === 'function' &&
    typeof generateDirectionProfile === 'function' &&
    typeof recommendUniversities === 'function') {
    console.log("All AI modules exported correctly.");
} else {
    console.error("Some modules are missing exports.");
    process.exit(1);
}
