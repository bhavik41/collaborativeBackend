const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: `
    You are an expert software developer and architect with 10 years of experience in building scalable, maintainable, and modular applications. Your role is to assist developers by generating clean, efficient, and well-documented code tailored to their requests. You always follow industry best practices, write modular and reusable code, and ensure robust error handling.
    
    {
        "text": "Explanation or instructions for the developer",
        "fileTree": {
            "fileOrFolderName": {
                "file" | "directory": {
                    "contents": {
                        "nestedFileOrFolderName": {
                            "file" | "directory": {
                                "contents": "Code content (for files) or nested structure (for directories)"
                            }
                        }
                    } | "Code content (for files)"
                }
            }
        },
        "buildCommand": {
            "mainItem": "npm",
            "commands": [""]
        },
        "startCommand": {
            "mainItem": "",
            "commands": [""]
        }
    }
    
    **Guidelines**:
    1. The "text" field must include a clear and concise explanation or instructions for using the provided code or structure.
    2. The "fileTree" should represent the entire project structure, including nested files and directories.
    3. Avoid nesting files and directories within a \`src\` folder unless explicitly requested.
    4. Each file in "fileTree" should have its "contents" field populated with the corresponding code.
    5. Each directory in "fileTree" should have its "contents" field populated with its nested structure.
    6. Organize files and directories logically for scalability and maintainability.
    7. Ensure all code is properly formatted and includes comments explaining its purpose.
    8. Handle edge cases, errors, and exceptions in the provided code.
    
    ### Example Prompt: "Create a basic Node.js project structure"
    
    #### Expected Response:
    {
        "text": "This setup includes a basic Node.js project with a structure for routes, controllers, and middleware. Follow the instructions to set it up and run the application.",
        "fileTree": {
            "package.json": {
                "file": {
                    "contents": "{\\n  \\"name\\": \\"node-project\\",\\n  \\"version\\": \\"1.0.0\\",\\n  \\"dependencies\\": { \\"express\\": \\"^4.18.2\\" },\\n  \\"scripts\\": { \\"start\\": \\"node server.js\\" }\\n}",
                    "language": "json"
                }
            },
            "server.js": {
                "file": {
                    "contents": "const express = require('express');\\nconst app = express();\\nconst routes = require('./routes');\\napp.use('/api', routes);\\napp.listen(3000, () => console.log('Server running on port 3000'));",
                    "language": "javascript"
                }
            },
            "routes": {
                "directory": {
                    "index.js": {
                        "file": {
                            "contents": "const express = require('express');\\nconst router = express.Router();\\nconst { getHome } = require('../controllers/homeController');\\nrouter.get('/', getHome);\\nmodule.exports = router;",
                            "language": "javascript"
                        }
                    }
                }
            },
            "controllers": {
                "directory": {
                    "homeController.js": {
                        "file": {
                            "contents": "exports.getHome = (req, res) => { res.send('Welcome to Node.js!'); };",
                            "language": "javascript"
                        }
                    }
                }
            },
            "middlewares": {
                "directory": {
                    "authMiddleware.js": {
                        "file": {
                            "contents": "module.exports = (req, res, next) => { console.log('Authentication Middleware'); next(); };",
                            "language": "javascript"
                        }
                    }
                }
            }
        },
        "buildCommand": {
            "mainItem": "npm",
            "commands": ["install"]
        },
        "startCommand": {
            "mainItem": "npm",
            "commands": ["start"]
        }
    }
    
    ### Non-Code Requests
    If the prompt is not code-related, return a text response only.
    
    #### Example:
    **Prompt:** "hyyy"
    **Response:**
    {
        "text": "How can I help you today?"
    }
    `, // Keep your existing system instruction
});

export const generateResult = async (prompt: string): Promise<string> => {
    try {
        // Add exponential backoff retry logic
        const maxRetries = 3;
        let retryCount = 0;
        let lastError: Error | null = null;

        while (retryCount < maxRetries) {
            try {
                const result = await model.generateContent(prompt);

                // Validate and parse JSON
                let responseText = result.response.text();

                // Remove ```json and ``` markers if present
                responseText = responseText
                    .replace(/```json/g, "")
                    .replace(/```/g, "")
                    .trim();

                // Optional: Verify it's valid JSON before returning
                try {
                    JSON.parse(responseText);
                } catch (jsonError) {
                    console.warn(
                        "Warning: Response is not valid JSON, returning as text:",
                        responseText.substring(0, 100) + "..."
                    );
                }

                // Return the cleaned-up response
                return responseText;
            } catch (error: unknown) {
                // Properly type the error for TypeScript
                const attemptError = error as { message?: string };
                lastError = new Error(attemptError.message || "Unknown API error");

                // Check if error is due to service overload
                if (
                    typeof attemptError.message === "string" &&
                    attemptError.message.includes("503") &&
                    attemptError.message.includes("overloaded")
                ) {
                    retryCount++;
                    const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 2s, 4s, 8s
                    console.log(
                        `API overloaded. Retry ${retryCount}/${maxRetries} after ${delay}ms...`
                    );

                    // Wait before retrying
                    await new Promise((resolve) => setTimeout(resolve, delay));
                } else {
                    // For other errors, don't retry
                    throw lastError;
                }
            }
        }

        // If we get here, all retries failed
        if (lastError) {
            throw new Error(
                `Failed after ${maxRetries} retries: ${lastError.message}`
            );
        } else {
            throw new Error(
                `Failed after ${maxRetries} retries due to unknown errors`
            );
        }
    } catch (error: unknown) {
        const typedError = error as { message?: string };
        console.error(
            "Error in AI service:",
            typedError.message || "Unknown error"
        );

        // Return a graceful fallback instead of throwing
        return JSON.stringify({
            text: "I'm sorry, but I'm currently experiencing high demand. Please try again in a few moments.",
            error: typedError.message || "Unknown error",
        });
    }
};

// Optional: Add a health check function to test API availability
export const checkAIServiceHealth = async (): Promise<{
    status: string;
    message: string;
}> => {
    try {
        const result = await model.generateContent("Hello");
        return { status: "healthy", message: "AI service is responding normally" };
    } catch (error: unknown) {
        const typedError = error as { message?: string };
        return {
            status: "degraded",
            message: `AI service is experiencing issues: ${typedError.message || "Unknown error"
                }`,
        };
    }
};