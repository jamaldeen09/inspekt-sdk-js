import axios from "axios";

export interface InspektOptions {
    /** The project API Key from your Inspekt Dashboard */
    apiKey: string;

    /**
     * Toggles the visual AI analysis cards in the terminal.
     * * When true (default), Inspekt will print a structured, color-coded 
     * diagnosis to the console. Set to false in environments where 
     * you want silent monitoring or are piping logs to a third-party 
     * logging service.
     * * @default true
     */
    terminalOutput?: boolean;

    /** * Determines which responses trigger an AI analysis.
     * 'errors' (default): Only 4xx and 5xx.
     * 'always': Every single request (EXPENSIVE).
     * 'never': Turn off analysis but keep logging.
     */
    analysisMode?: 'errors' | 'always' | 'never';

    /** List of sensitive keys to redact from headers and body before sending to AI */
    redactKeys?: string[];
};


class Inspekt {
    private apiKey: string;
    private options: Required<Omit<InspektOptions, 'apiKey'>>;

    // ---- Constructor ------------------
    constructor(options: InspektOptions) {
        this.apiKey = this.validateApiKey(options.apiKey);

        // Set smart defaults so the user doesn't have to provide everything
        this.options = {
            analysisMode: options.analysisMode ?? 'errors',
            redactKeys: ['authorization', ...(options.redactKeys ?? [])],
            terminalOutput: options.terminalOutput ?? true
        };
    }

    /**
     * Validates api keys to follow inspekt's official
     * api key format and to make sure it exists
     * @param key 
     * @private
     */
    private validateApiKey(key: string): string {
        // Basic check: Does the key exist?
        if (!key || key?.trim() === "") {
            throw new Error("[Inspekt] API Key is missing. Get one at https://inspekt.app");
        };

        // Format check: Does it start with the custom prefix?
        const prefix = "ins_live_";
        if (!key.startsWith(prefix)) {
            throw new Error(`[Inspekt] Invalid API Key format. Keys should start with "${prefix}"`);
        }

        // Length check: Must be exactly 32
        const calculatedLength = prefix.length + 32;
        if (key.length < calculatedLength) {
            throw new Error("[Inspekt] API Key seems too short. Please check your dashboard.");
        };

        if (key.length > calculatedLength) {
            throw new Error("[Inspekt] API Key seems too long. Please check your dashboard.");
        }

        return key;
    };

    /**
     * Renders the AI analysis results to the system console.
     * * This method handles the visual construction of the "Inspekt Card,"
     * including ANSI color-coding for severity levels (OK, WARNING, CRITICAL),
     * and structured sections for Diagnosis, Issues, Security, and Fixes.
     * @param analysis - The structured JSON object returned from the Inspekt AI engine.
     * @param req - The incoming Express request object used to extract the method, path, and timestamp.
     * @private
     */
    private logAnalysis(analysis: any, req: any) {
        const severity: string = analysis.severity?.toUpperCase();
        const severityColor: string = {
            'OK': '\x1b[32m',    // green
            'WARNING': '\x1b[33m',   // yellow
            'CRITICAL': '\x1b[31m',  // red
        }[severity] ?? '\x1b[37m'

        const reset = '\x1b[0m';
        const dim = '\x1b[2m';
        const bold = '\x1b[1m';
        const cyan = '\x1b[36m';
        const inverse = '\x1b[7m';
        const timestamp = new Date().toLocaleTimeString();
        const path = req.originalUrl || req.url || '/';

        console.log(`\n${inverse}${bold} ${req.method} ${path} ${reset} ${dim}${timestamp}${reset}`);
        console.log(`\n${bold}${cyan}INSPEKT${reset} ${dim}─────────────────────────────────────────${reset} ${severityColor}${bold}${severity}${reset}`);

        // Summary + Status
        console.log(`\n${bold}${analysis.summary}${reset}`);
        console.log(`${dim}${analysis.status.code} · ${analysis.status.meaning}${reset}`);

        // Diagnosis
        console.log(`\n${bold}Diagnosis${reset}`);
        console.log(`  ${analysis.diagnosis}`);

        // Issues
        if (analysis.issues?.length > 0) {
            console.log(`\n${bold}Issues${reset}`);
            analysis.issues.forEach((i: string) => console.log(`  \x1b[33m·\x1b[0m ${i}`));
        }

        // Security & Headers
        if (analysis.headers?.security_flags?.length > 0 || analysis.headers?.missing?.length > 0) {
            console.log(`\n${bold}Security & Headers${reset}`);
            analysis.headers.security_flags?.forEach((f: string) => console.log(`  \x1b[31m· FLAG\x1b[0m ${f}`));
            analysis.headers.missing?.forEach((m: string) => console.log(`  \x1b[33m· MISSING\x1b[0m ${m}`));
        }

        // Body & Performance
        if (analysis.body?.anomalies?.length > 0 || analysis.performance_flags?.length > 0) {
            console.log(`\n${bold}Performance & Body${reset}`);
            analysis.body?.anomalies?.forEach((a: string) => console.log(`  \x1b[36m· BODY\x1b[0m ${a}`));
            analysis.performance_flags?.forEach((p: string) => console.log(`  \x1b[36m· PERF\x1b[0m ${p}`));
        }

        // Fixes
        if (analysis.fixes?.length > 0) {
            console.log(`\n${bold}Fixes${reset}`);
            analysis.fixes.forEach((f: string) => console.log(`  \x1b[32m·\x1b[0m ${f}`));
        }

        console.log(`\n${dim}─────────────────────────────────────────────────────${reset}\n`);
    }

    /**
     * core analysis trigger. sends request/response metadata to the 
     * inspekt-api for ai-driven diagnosis.
     * @param data - the captured http exchange data
     * @returns the axios response from the inspekt-api or undefined if skipped
     * @public
     */
    public async analyze<TBody = Record<string, unknown>, THeaders = Record<string, unknown>>(data: {
        url: string;
        method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
        status: number;
        headers?: THeaders;
        body?: TBody;
    }) {
        try {
            // ** Decides WHEN to analyze
            const shouldAnalyze = data.status >= 400 && this.options.analysisMode === "errors" || this.options.analysisMode === "always"

            if (shouldAnalyze) {
                // Prepare the url
                const initialUrl = "https://inspekt-api-production.up.railway.app/api/v1/analyze";
                const inspektApiUrl = new URL(initialUrl);

                // Set the search param
                inspektApiUrl.searchParams.set("analysisMode", this.options.analysisMode)

                // TODO: REMOVE THIS LINE OF CODE BECAUSE THE AI_ANALYSIS SEARCH PARAM
                // TODO[CONTINUED]: WILL BE DEPRECIATED
                inspektApiUrl.searchParams.set("ai_analysis", "true");

                // Make a request to inspekt's api
                const response = await axios.post(inspektApiUrl.toString(), {
                    url: data.url,
                    method: data.method,
                    redactKeys: this.options.redactKeys,
                    headers: data.headers,
                    body: data.body,
                }, {
                    headers: {
                        "x-api-key": this.apiKey,
                        "Content-Type": "application/json"
                    },
                    // timeout: 5000 // Ensures we don't hang the process if the api is slow 
                    // TODO: Adjust this timer after getting the average response time of inspekt's api
                });

                return response;
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                // The server responded with a status code outside the 2xx range (400, 500, etc.)
                if (err.response) return err.response

                // The request was made but no response was received (e.g., network timeout)
                if (err.request)
                    console.error("[Inspekt] Connection Timeout: Unable to reach the analysis engine. If your internet is stable, please check our status page: https://status.inspekt.app")
            }

            else console.error(`[Inspekt] Internal SDK Error:`, err);
        }
    }

    /**
     * processes the captured response in the background.
     * handles the logic for parsing the ai response and triggering the console logs.
     * @param req - the original express request object
     * @param res - the express response object
     * @param body - the intercepted response body
     * @public
     */
    public async backgroundAnalysis(req: any, res: any, body: any) {
        // ---- Build the url ------------
        const host = req?.headers?.host || req?.get?.('host') || 'localhost';
        const protocol = (req as any).protocol || 'http';
        const path = req?.originalUrl || req?.url || '/';
        const url = `${protocol}://${host}${path}`;

        // --- Response ----------------
        const response = await this.analyze({
            url,
            method: req?.method as any,
            status: res?.statusCode,
            headers: req?.headers,
            body: body,
        });

        // If analyze() returns nothing, we didn't intend to analyze this request
        if (!response) return;

        // Successful AI processing
        if ((response.data && response.data?.data?.analysis) && this.options.terminalOutput)
            this.logAnalysis(response.data?.data?.analysis, req);

        // Case where server received the request but skipped analysis (e.g., out of credits)
        else if (response.status === 200 && !response.data?.data?.analysis)
            console.warn(`[Inspekt] Analysis skipped: The server accepted the request but returned no analysis.`);

        // This means either the response data does not exists
        // or the response data's "analysis" object is null or
        // undefined
        else {
            const message = response.data?.message || "Unknown API error";
            console.error(`[Inspekt] Analysis Failed (${response.status}): ${message}`);
        }
    }
}

export default Inspekt