/**
 * Possessed Butler - Tool Registry
 *
 * Strict registry of all available tools with Zod parameter schemas,
 * risk metadata, and execution handlers operating on local deterministic sandbox fixtures.
 */

import { z } from "zod";
import { ToolMetadata, TrustContext } from "@/types";
import {
  MOCK_EMAILS,
  MOCK_WEBPAGES,
  MOCK_DOCUMENTS,
  MOCK_FILES,
} from "./sandbox/fixtures";

export interface ToolExecutionOutput {
  data: unknown;
  rawOutput?: string;
  isExternalContent: boolean;
  taintApplied: string[];
}

export interface RegisteredTool<T = unknown> {
  metadata: ToolMetadata;
  schema: z.ZodType<T>;
  execute: (params: T, context: TrustContext) => Promise<ToolExecutionOutput>;
}

class ToolRegistry {
  private tools: Map<string, RegisteredTool<unknown>> = new Map();

  registerTool<T>(tool: RegisteredTool<T>): void {
    if (this.tools.has(tool.metadata.name)) {
      throw new Error(`Tool with name "${tool.metadata.name}" is already registered.`);
    }
    this.tools.set(tool.metadata.name, tool as RegisteredTool<unknown>);
  }

  getTool(name: string): RegisteredTool<unknown> | undefined {
    return this.tools.get(name);
  }

  getAllToolMetadata(): ToolMetadata[] {
    return Array.from(this.tools.values()).map((t) => t.metadata);
  }
}

export const defaultToolRegistry = new ToolRegistry();

// 1. read_email tool
defaultToolRegistry.registerTool({
  metadata: {
    name: "read_email",
    description: "Reads an email from the local sandbox inbox by ID.",
    riskTier: "READ_ONLY",
    isConsequential: false,
    requiresConfirmation: false,
    parameters: {
      emailId: {
        type: "string",
        description: "The unique identifier of the email (e.g. 'email-001').",
        required: true,
      },
    },
  },
  schema: z.object({
    emailId: z.string().min(1, "emailId is required"),
  }),
  execute: async ({ emailId }) => {
    const email = MOCK_EMAILS[emailId];
    if (!email) {
      throw new Error(`Email with ID "${emailId}" not found in sandbox inbox.`);
    }
    return {
      data: email,
      rawOutput: `From: ${email.sender}\nSubject: ${email.subject}\nBody: ${email.body}`,
      isExternalContent: true,
      taintApplied: [`taint:email:${emailId}`],
    };
  },
});

// 2. send_email tool (Consequential)
defaultToolRegistry.registerTool({
  metadata: {
    name: "send_email",
    description: "Sends an email to an external recipient. High-consequence state-mutating action.",
    riskTier: "HIGH_CONSEQUENCE",
    isConsequential: true,
    requiresConfirmation: true,
    parameters: {
      to: {
        type: "string",
        description: "Recipient email address.",
        required: true,
      },
      subject: {
        type: "string",
        description: "Email subject line.",
        required: true,
      },
      body: {
        type: "string",
        description: "Body message text.",
        required: true,
      },
    },
  },
  schema: z.object({
    to: z.string().email("Invalid email address"),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().min(1, "Body is required"),
  }),
  execute: async ({ to, subject, body }) => {
    return {
      data: {
        messageId: `msg_${Date.now()}`,
        status: "DISPATCHED_IN_SANDBOX",
        recipient: to,
        subject,
        bodyBytes: body.length,
      },
      rawOutput: `Email successfully sent in sandbox to ${to} with subject "${subject}".`,
      isExternalContent: false,
      taintApplied: [],
    };
  },
});

// 3. fetch_webpage tool
defaultToolRegistry.registerTool({
  metadata: {
    name: "fetch_webpage",
    description: "Fetches and extracts text content from a web URL in the sandbox.",
    riskTier: "READ_ONLY",
    isConsequential: false,
    requiresConfirmation: false,
    parameters: {
      url: {
        type: "string",
        description: "The HTTP/HTTPS URL to fetch.",
        required: true,
      },
    },
  },
  schema: z.object({
    url: z.string().url("Must be a valid URL"),
  }),
  execute: async ({ url }) => {
    const page = MOCK_WEBPAGES[url];
    if (!page) {
      throw new Error(`Webpage "${url}" is not present in local sandbox fixture.`);
    }
    return {
      data: page,
      rawOutput: `Title: ${page.title}\nContent: ${page.content}`,
      isExternalContent: true,
      taintApplied: [`taint:web:${url}`],
    };
  },
});

// 4. read_pdf tool
defaultToolRegistry.registerTool({
  metadata: {
    name: "read_pdf",
    description: "Extracts text pages from a PDF document in the sandbox.",
    riskTier: "READ_ONLY",
    isConsequential: false,
    requiresConfirmation: false,
    parameters: {
      path: {
        type: "string",
        description: "Filename of the PDF in the sandbox (e.g. 'report-q3.pdf').",
        required: true,
      },
    },
  },
  schema: z.object({
    path: z.string().min(1, "path is required"),
  }),
  execute: async ({ path }) => {
    const doc = MOCK_DOCUMENTS[path];
    if (!doc) {
      throw new Error(`Document "${path}" not found in sandbox.`);
    }
    return {
      data: doc,
      rawOutput: `PDF: ${doc.title}\nPages:\n${doc.pages.join("\n")}`,
      isExternalContent: true,
      taintApplied: [`taint:pdf:${path}`],
    };
  },
});

// 5. read_file tool
defaultToolRegistry.registerTool({
  metadata: {
    name: "read_file",
    description: "Reads local file contents from the sandbox storage.",
    riskTier: "LOW_RISK",
    isConsequential: false,
    requiresConfirmation: false,
    parameters: {
      path: {
        type: "string",
        description: "Relative file path inside the sandbox (e.g. 'notes.txt').",
        required: true,
      },
    },
  },
  schema: z.object({
    path: z.string().min(1, "path is required"),
  }),
  execute: async ({ path }) => {
    const file = MOCK_FILES[path];
    if (!file) {
      throw new Error(`File "${path}" not found in sandbox storage.`);
    }
    return {
      data: { path: file.path, content: file.content },
      rawOutput: file.content,
      isExternalContent: false,
      taintApplied: [],
    };
  },
});

// 6. edit_file tool (Consequential)
defaultToolRegistry.registerTool({
  metadata: {
    name: "edit_file",
    description: "Writes or replaces file contents in the sandbox storage. Consequential state modification.",
    riskTier: "HIGH_CONSEQUENCE",
    isConsequential: true,
    requiresConfirmation: true,
    parameters: {
      path: {
        type: "string",
        description: "File path to modify.",
        required: true,
      },
      content: {
        type: "string",
        description: "New content to write.",
        required: true,
      },
    },
  },
  schema: z.object({
    path: z.string().min(1, "path is required"),
    content: z.string().min(1, "content is required"),
  }),
  execute: async ({ path, content }) => {
    // Modify in-memory fixture for this sandbox session
    MOCK_FILES[path] = {
      path,
      content,
      isSensitive: false,
    };
    return {
      data: { path, bytesWritten: content.length, status: "UPDATED" },
      rawOutput: `File ${path} updated (${content.length} bytes written).`,
      isExternalContent: false,
      taintApplied: [],
    };
  },
});
