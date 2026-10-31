"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  FileText,
  Mail,
  FileSpreadsheet,
  FileCode,
  Folder,
  FolderOpen,
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Search,
  Grid,
  List,
  Eye,
  Trash2,
  Sparkles,
  CheckCircle2,
  XCircle,
  X,
  Lock,
  RefreshCw,
  Bot,
  ArrowRight,
} from "lucide-react";
import { WorkspaceFile, FileSecurityStatus, WorkspaceFolder } from "@/types/file-workspace";
import { DEMO_PRESET_FILES } from "@/lib/files/demo-presets";

interface SecureFileWorkspaceProps {
  onSendToAgent?: (file: WorkspaceFile) => void;
}

const STORAGE_KEY = "kavach_secure_workspace_files_v1";

export function SecureFileWorkspace({ onSendToAgent }: SecureFileWorkspaceProps) {
  // State
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFolder, setActiveFolder] = useState<WorkspaceFolder>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FileSecurityStatus>("ALL");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size" | "status">("date");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Selection & Detail Drawer
  const [selectedFile, setSelectedFile] = useState<WorkspaceFile | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "content" | "signals" | "agent">("overview");

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadTargetFolder, setUploadTargetFolder] = useState<"Safe Samples" | "Attack Samples" | "Unknown / Unclassified">("Unknown / Unclassified");
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage or initialize with empty workspace
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFiles(parsed);
          return;
        }
      }
    } catch {
      // fallback to empty state
    }
  }, []);

  // Sync to localStorage
  const saveFiles = (updatedFiles: WorkspaceFile[]) => {
    setFiles(updatedFiles);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedFiles));
    } catch (e) {
      console.warn("Failed to persist files to localStorage", e);
    }
  };

  // Inspect a file via /api/files/inspect
  const inspectAndAddFile = async (
    fileData: { fileName: string; bufferOrText: string | File; mimeType?: string; folder: string }
  ): Promise<WorkspaceFile | null> => {
    try {
      let response: Response;

      if (fileData.bufferOrText instanceof File) {
        const formData = new FormData();
        formData.append("file", fileData.bufferOrText);
        formData.append("folder", fileData.folder);

        response = await fetch("/api/files/inspect", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/files/inspect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: fileData.fileName,
            content: fileData.bufferOrText,
            mimeType: fileData.mimeType,
            folder: fileData.folder,
          }),
        });
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Inspection failed.");
      }

      return data.file as WorkspaceFile;
    } catch (err) {
      console.error("Inspection error:", err);
      throw err;
    }
  };

  // Handle uploading real files from input or dropzone
  const handleUploadFiles = async (fileList: FileList | File[]) => {
    setIsProcessingUpload(true);
    setUploadError(null);
    const newFiles: WorkspaceFile[] = [];

    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgressText(`Inspecting ${file.name} (${i + 1}/${fileList.length})...`);

        const inspected = await inspectAndAddFile({
          fileName: file.name,
          bufferOrText: file,
          mimeType: file.type,
          folder: uploadTargetFolder,
        });

        if (inspected) {
          newFiles.unshift(inspected);
        }
      }

      const merged = [...newFiles, ...files];
      saveFiles(merged);
      setIsUploadModalOpen(false);

      // Auto-select the first uploaded file for inspection
      if (newFiles.length > 0) {
        setSelectedFile(newFiles[0]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to upload and inspect file.");
    } finally {
      setIsProcessingUpload(false);
      setUploadProgressText("");
    }
  };

  // Quick Demo Loader: Populates with pre-packaged realistic demo files
  const handleLoadDemoSamples = async () => {
    setIsProcessingUpload(true);
    setUploadError(null);
    const demoResults: WorkspaceFile[] = [];

    try {
      for (let i = 0; i < DEMO_PRESET_FILES.length; i++) {
        const preset = DEMO_PRESET_FILES[i];
        setUploadProgressText(`Scanning ${preset.name} (${i + 1}/${DEMO_PRESET_FILES.length})...`);

        const inspected = await inspectAndAddFile({
          fileName: preset.name,
          bufferOrText: preset.content,
          mimeType: preset.mimeType,
          folder: preset.folder,
        });

        if (inspected) {
          demoResults.push(inspected);
        }
      }

      saveFiles(demoResults);
      if (demoResults.length > 0) {
        setSelectedFile(demoResults[0]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to load demo files.");
    } finally {
      setIsProcessingUpload(false);
      setUploadProgressText("");
    }
  };

  // Clear workspace
  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all files from your Secure Workspace?")) {
      saveFiles([]);
      setSelectedFile(null);
    }
  };

  // Delete single file
  const handleDeleteFile = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = files.filter((f) => f.id !== id);
    saveFiles(updated);
    if (selectedFile?.id === id) {
      setSelectedFile(null);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Filter & Sort
  const filteredFiles = files
    .filter((f) => {
      // Folder filter
      if (activeFolder !== "All" && f.folder !== activeFolder) return false;
      // Status filter
      if (statusFilter !== "ALL" && f.securityStatus !== statusFilter) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return f.name.toLowerCase().includes(q) || f.type.toLowerCase().includes(q) || (f.threatCategory && f.threatCategory.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "date") return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "size") return b.sizeBytes - a.sizeBytes;
      if (sortBy === "status") return a.securityStatus.localeCompare(b.securityStatus);
      return 0;
    });

  // Helper for File Icon
  const getFileIcon = (type: WorkspaceFile["type"], className = "w-5 h-5") => {
    switch (type) {
      case "PDF":
        return <FileText className={`${className} text-[#A84234]`} />;
      case "Email":
        return <Mail className={`${className} text-[#2E595A]`} />;
      case "Spreadsheet":
        return <FileSpreadsheet className={`${className} text-[#1E5E4E]`} />;
      case "JSON":
        return <FileCode className={`${className} text-[#C9A86A]`} />;
      default:
        return <FileText className={`${className} text-[#678882]`} />;
    }
  };

  // Helper for Status Badge
  const getStatusBadge = (status: FileSecurityStatus) => {
    switch (status) {
      case "SAFE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EBF3EF] text-[#1E5E4E] border border-[#C5DDD2]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1E5E4E]" />
            SAFE
          </span>
        );
      case "THREAT_DETECTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDF0ED] text-[#C2410C] border border-[#F6D0C5]">
            <ShieldAlert className="w-3.5 h-3.5 text-[#C2410C]" />
            THREAT DETECTED
          </span>
        );
      case "BLOCKED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FDF0ED] text-[#991B1B] border border-[#F6D0C5]">
            <XCircle className="w-3.5 h-3.5 text-[#991B1B]" />
            BLOCKED
          </span>
        );
      case "SUSPICIOUS":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FFF9EB] text-[#B45309] border border-[#FDE68A]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />
            SUSPICIOUS
          </span>
        );
      case "ANALYZING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EBF1ED] text-[#678882] animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ANALYZING
          </span>
        );
    }
  };

  // Folder counts
  const folderCounts = {
    All: files.length,
    "Safe Samples": files.filter((f) => f.folder === "Safe Samples").length,
    "Attack Samples": files.filter((f) => f.folder === "Attack Samples").length,
    "Unknown / Unclassified": files.filter((f) => f.folder === "Unknown / Unclassified").length,
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E2E8E5] shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#052326] text-[#C9A86A] rounded-xl shadow-sm">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-[#052326]">
                Secure File Workspace
              </h1>
              <p className="text-sm text-[#678882]">
                Inspect emails, PDFs, and documents for prompt injection, data exfiltration, and malicious instructions.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#052326] text-white hover:bg-[#0A2E33] active:scale-[0.98] transition-all rounded-xl font-medium text-sm shadow-sm"
          >
            <Upload className="w-4 h-4 text-[#C9A86A]" />
            Upload Files
          </button>

          <button
            onClick={handleLoadDemoSamples}
            disabled={isProcessingUpload}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#F4F6F4] text-[#052326] hover:bg-[#E8ECE9] active:scale-[0.98] transition-all rounded-xl font-medium text-sm border border-[#D3DDD7]"
            title="Populates with realistic test files for quick demo"
          >
            <Sparkles className="w-4 h-4 text-[#C9A86A]" />
            Demo Samples
          </button>

          {files.length > 0 && (
            <button
              onClick={handleClearAll}
              className="p-2.5 text-[#678882] hover:text-[#C2410C] hover:bg-[#FDF0ED] rounded-xl transition-colors border border-transparent hover:border-[#F6D0C5]"
              title="Clear all workspace files"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Folders Bar (Drive Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["All", "Safe Samples", "Attack Samples", "Unknown / Unclassified"] as WorkspaceFolder[]).map((folderName) => {
          const isActive = activeFolder === folderName;
          return (
            <button
              key={folderName}
              onClick={() => setActiveFolder(folderName)}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                isActive
                  ? "bg-[#052326] text-white border-[#052326] shadow-sm"
                  : "bg-white text-[#052326] border-[#E2E8E5] hover:border-[#678882]/40 hover:bg-[#F9FBFA]"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isActive ? (
                  <FolderOpen className="w-5 h-5 text-[#C9A86A] shrink-0" />
                ) : (
                  <Folder className="w-5 h-5 text-[#678882] shrink-0" />
                )}
                <span className="text-sm font-medium truncate">{folderName}</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono shrink-0 ${
                  isActive ? "bg-white/20 text-white" : "bg-[#F4F6F4] text-[#678882]"
                }`}
              >
                {folderCounts[folderName]}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Search & Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E2E8E5]">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#678882] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files by name, type, or threat..."
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-[#F9FBFA] border border-[#E2E8E5] rounded-lg text-[#052326] placeholder-[#678882]/60 focus:outline-none focus:ring-1 focus:ring-[#052326] focus:border-[#052326]"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(["ALL", "SAFE", "SUSPICIOUS", "THREAT_DETECTED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === st
                  ? "bg-[#052326] text-white"
                  : "bg-[#F4F6F4] text-[#678882] hover:bg-[#E8ECE9]"
              }`}
            >
              {st === "ALL" ? "All Status" : st.replace("_", " ")}
            </button>
          ))}
        </div>

        {/* Sort & View Mode */}
        <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-[#E2E8E5] pt-2 md:pt-0 md:pl-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="text-xs bg-[#F9FBFA] border border-[#E2E8E5] rounded-lg px-2.5 py-1.5 text-[#052326] focus:outline-none"
          >
            <option value="date">Sort: Date Added</option>
            <option value="name">Sort: Name (A-Z)</option>
            <option value="size">Sort: Size</option>
            <option value="status">Sort: Security</option>
          </select>

          <div className="flex items-center border border-[#E2E8E5] rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 transition-colors ${
                viewMode === "list" ? "bg-[#052326] text-white" : "bg-white text-[#678882] hover:bg-[#F4F6F4]"
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 transition-colors ${
                viewMode === "grid" ? "bg-[#052326] text-white" : "bg-white text-[#678882] hover:bg-[#F4F6F4]"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Files List or Grid */}
      {filteredFiles.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-dashed border-[#D3DDD7] p-12 text-center">
          <div className="w-16 h-16 bg-[#EBF1ED] text-[#2E595A] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-[#2E595A]" />
          </div>
          <h3 className="text-lg font-serif font-bold text-[#052326] mb-1">
            Your Secure Workspace is empty
          </h3>
          <p className="text-sm text-[#678882] max-w-md mx-auto mb-6">
            Upload emails, PDFs, or documents and Kavach will inspect them for prompt injection, data exfiltration, and unauthorized directives.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#052326] text-white hover:bg-[#0A2E33] transition-all rounded-xl font-medium text-sm"
            >
              <Upload className="w-4 h-4 text-[#C9A86A]" />
              Upload Files
            </button>
            <button
              onClick={handleLoadDemoSamples}
              disabled={isProcessingUpload}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#F4F6F4] text-[#052326] hover:bg-[#E8ECE9] transition-all rounded-xl font-medium text-sm border border-[#D3DDD7]"
            >
              <Sparkles className="w-4 h-4 text-[#C9A86A]" />
              Load Demo Samples
            </button>
          </div>
        </div>
      ) : viewMode === "list" ? (
        /* List / Table View */
        <div className="bg-white rounded-2xl border border-[#E2E8E5] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F9FBFA] border-b border-[#E2E8E5] text-xs font-semibold text-[#678882]">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Folder</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Security Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8E5]">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFile?.id === file.id;
                  return (
                    <tr
                      key={file.id}
                      onClick={() => setSelectedFile(file)}
                      className={`cursor-pointer transition-colors group ${
                        isSelected
                          ? "bg-[#EBF1ED]/70"
                          : "hover:bg-[#F9FBFA]"
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {getFileIcon(file.type)}
                          <div className="min-w-0">
                            <span className="font-medium text-[#052326] block truncate group-hover:text-[#2E595A]">
                              {file.name}
                            </span>
                            <span className="text-xs text-[#678882]">
                              {new Date(file.uploadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#678882]">
                        {file.type}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[#678882]">
                        <span className="inline-flex items-center gap-1">
                          <Folder className="w-3.5 h-3.5 text-[#678882]/70" />
                          {file.folder}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#678882]">
                        {file.formattedSize}
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(file.securityStatus)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(file);
                            }}
                            className="p-1.5 text-[#678882] hover:text-[#052326] hover:bg-[#E8ECE9] rounded-lg transition-colors"
                            title="View security details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            className="p-1.5 text-[#678882] hover:text-[#C2410C] hover:bg-[#FDF0ED] rounded-lg transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map((file) => {
            const isSelected = selectedFile?.id === file.id;
            return (
              <div
                key={file.id}
                onClick={() => setSelectedFile(file)}
                className={`bg-white p-4 rounded-xl border transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? "border-[#052326] ring-2 ring-[#052326]/10 shadow-sm"
                    : "border-[#E2E8E5] hover:border-[#678882]/50 hover:shadow-sm"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-[#F4F6F4] rounded-lg">
                      {getFileIcon(file.type, "w-6 h-6")}
                    </div>
                    {getStatusBadge(file.securityStatus)}
                  </div>
                  <h4 className="font-medium text-sm text-[#052326] line-clamp-1 mb-1 group-hover:text-[#2E595A]">
                    {file.name}
                  </h4>
                  <p className="text-xs text-[#678882] line-clamp-2 mb-3">
                    {file.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#E8ECE9] flex items-center justify-between text-xs text-[#678882]">
                  <span>{file.formattedSize}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleDeleteFile(file.id, e)}
                      className="p-1 text-[#678882] hover:text-[#C2410C] rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. File Details / Security Analysis Drawer */}
      {selectedFile && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white border-l border-[#E2E8E5] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-[#E2E8E5] flex items-center justify-between bg-[#F9FBFA]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 bg-white rounded-lg border border-[#E2E8E5]">
                {getFileIcon(selectedFile.type, "w-6 h-6")}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-[#052326] truncate">
                  {selectedFile.name}
                </h3>
                <span className="text-xs text-[#678882]">
                  {selectedFile.type} • {selectedFile.formattedSize}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1.5 text-[#678882] hover:text-[#052326] hover:bg-[#E8ECE9] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Security Status Banner */}
          <div
            className={`p-4 border-b ${
              selectedFile.securityStatus === "SAFE"
                ? "bg-[#EBF3EF]/60 border-[#C5DDD2]"
                : selectedFile.securityStatus === "THREAT_DETECTED" || selectedFile.securityStatus === "BLOCKED"
                ? "bg-[#FDF0ED] border-[#F6D0C5]"
                : "bg-[#FFF9EB] border-[#FDE68A]"
            }`}
          >
            <div className="flex items-start gap-3">
              {selectedFile.securityStatus === "SAFE" ? (
                <ShieldCheck className="w-6 h-6 text-[#1E5E4E] shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-6 h-6 text-[#C2410C] shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h4
                    className={`font-semibold text-sm ${
                      selectedFile.securityStatus === "SAFE"
                        ? "text-[#1E5E4E]"
                        : "text-[#C2410C]"
                    }`}
                  >
                    {selectedFile.securityStatus === "SAFE"
                      ? "✓ SAFE — VERIFIED DOCUMENT"
                      : "⛔ THREAT DETECTED IN FILE"}
                  </h4>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-white/80 font-bold">
                    Risk: {selectedFile.riskLevel}
                  </span>
                </div>
                <p className="text-xs text-[#052326]/80 mt-1">
                  {selectedFile.summary}
                </p>
              </div>
            </div>
          </div>

          {/* Drawer Tabs */}
          <div className="flex border-b border-[#E2E8E5] px-4 bg-[#F9FBFA] text-xs font-medium">
            <button
              onClick={() => setActiveDetailTab("overview")}
              className={`py-2.5 px-3 border-b-2 transition-colors ${
                activeDetailTab === "overview"
                  ? "border-[#052326] text-[#052326] font-semibold"
                  : "border-transparent text-[#678882] hover:text-[#052326]"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveDetailTab("signals")}
              className={`py-2.5 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                activeDetailTab === "signals"
                  ? "border-[#052326] text-[#052326] font-semibold"
                  : "border-transparent text-[#678882] hover:text-[#052326]"
              }`}
            >
              Security Signals
              {selectedFile.signals.length > 0 && (
                <span className="bg-[#C2410C] text-white text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                  {selectedFile.signals.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveDetailTab("content")}
              className={`py-2.5 px-3 border-b-2 transition-colors ${
                activeDetailTab === "content"
                  ? "border-[#052326] text-[#052326] font-semibold"
                  : "border-transparent text-[#678882] hover:text-[#052326]"
              }`}
            >
              Extracted Content
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {activeDetailTab === "overview" && (
              <div className="space-y-4">
                {/* Threat Category Card */}
                {selectedFile.threatCategory && (
                  <div className="bg-[#F9FBFA] p-3.5 rounded-xl border border-[#E2E8E5]">
                    <span className="text-[11px] text-[#678882] font-semibold uppercase tracking-wider block mb-1">
                      Identified Attack Vector
                    </span>
                    <span className="text-sm font-semibold text-[#052326]">
                      {selectedFile.threatCategory.replace(/_/g, " ")}
                    </span>
                  </div>
                )}

                {/* File Metadata */}
                <div className="bg-[#F9FBFA] p-3.5 rounded-xl border border-[#E2E8E5] space-y-2">
                  <span className="text-[11px] text-[#678882] font-semibold uppercase tracking-wider block mb-1">
                    File Metadata
                  </span>
                  <div className="flex justify-between py-1 border-b border-[#E8ECE9]">
                    <span className="text-[#678882]">File Format:</span>
                    <span className="font-mono text-[#052326]">{selectedFile.mimeType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8ECE9]">
                    <span className="text-[#678882]">Exact Size:</span>
                    <span className="font-mono text-[#052326]">{selectedFile.sizeBytes} bytes</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8ECE9]">
                    <span className="text-[#678882]">Target Folder:</span>
                    <span className="text-[#052326]">{selectedFile.folder}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-[#E8ECE9]">
                    <span className="text-[#678882]">Scanned At:</span>
                    <span className="font-mono text-[#052326]">{new Date(selectedFile.analyzedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-[#678882]">Trace Correlation ID:</span>
                    <span className="font-mono text-[#052326] truncate max-w-[200px]">{selectedFile.correlationId}</span>
                  </div>
                </div>

                {/* Invariant Note */}
                <div className="p-3.5 bg-[#EBF1ED] rounded-xl border border-[#C5DDD2] text-[#2E595A]">
                  <div className="flex items-center gap-2 font-semibold mb-1">
                    <Lock className="w-4 h-4 text-[#C9A86A]" />
                    Deterministic Invariant Active
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This file was ingested strictly as <strong>untrusted external data (Trust Level 1)</strong>. Kavach guarantees this document will never gain execution authority over tools or system policy.
                  </p>
                </div>

                {/* AI Agent Action Button */}
                {onSendToAgent && (
                  <button
                    onClick={() => {
                      onSendToAgent(selectedFile);
                      setSelectedFile(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-[#052326] text-white hover:bg-[#0A2E33] rounded-xl font-medium transition-all shadow-sm"
                  >
                    <Bot className="w-4 h-4 text-[#C9A86A]" />
                    <span>Ask Kavach to Process in AI Agent</span>
                    <ArrowRight className="w-4 h-4 text-[#C9A86A]" />
                  </button>
                )}
              </div>
            )}

            {activeDetailTab === "signals" && (
              <div className="space-y-3">
                {selectedFile.signals.length === 0 ? (
                  <div className="text-center py-8 text-[#678882]">
                    <CheckCircle2 className="w-8 h-8 text-[#1E5E4E] mx-auto mb-2" />
                    <p className="font-medium text-[#052326]">Zero threat indicators triggered</p>
                    <p className="text-[11px] mt-1">This document contains no known prompt injections, exfiltration patterns, or boundary breakouts.</p>
                  </div>
                ) : (
                  selectedFile.signals.map((signal, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-[#F6D0C5] bg-[#FDF0ED] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#C2410C]">
                          {signal.category.replace(/_/g, " ")}
                        </span>
                        <span className="px-2 py-0.5 bg-white text-[#C2410C] rounded font-mono font-bold text-[10px]">
                          {signal.severity} ({Math.round(signal.confidence * 100)}%)
                        </span>
                      </div>
                      <p className="text-[#052326] font-medium text-[11px]">
                        {signal.indicator}
                      </p>
                      {signal.evidenceSnippet && (
                        <div className="mt-2 p-2 bg-white/80 rounded border border-[#E8ECE9] font-mono text-[10px] text-[#052326] overflow-x-auto">
                          Snippet: &quot;{signal.evidenceSnippet}&quot;
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeDetailTab === "content" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[#678882] text-[11px] pb-1 border-b border-[#E8ECE9]">
                  <span>Sanitized Extracted Text</span>
                  <span>{selectedFile.extractedPreview.length} characters</span>
                </div>
                <pre className="p-3 bg-[#F9FBFA] border border-[#E2E8E5] rounded-xl font-mono text-[11px] text-[#052326] whitespace-pre-wrap leading-relaxed max-h-[380px] overflow-y-auto">
                  {selectedFile.extractedPreview || "(Empty or non-text content)"}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-[#E2E8E5] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#052326] text-[#C9A86A] rounded-lg">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#052326]">
                    Upload Files to Workspace
                  </h3>
                  <p className="text-xs text-[#678882]">
                    Files are scanned through the Kavach Security Gateway before ingestion.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1.5 text-[#678882] hover:text-[#052326] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Folder Destination Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#052326] block">
                Destination Folder:
              </label>
              <select
                value={uploadTargetFolder}
                onChange={(e) => setUploadTargetFolder(e.target.value as typeof uploadTargetFolder)}
                className="w-full text-xs bg-[#F9FBFA] border border-[#E2E8E5] rounded-xl px-3 py-2 text-[#052326] focus:outline-none"
              >
                <option value="Unknown / Unclassified">Unknown / Unclassified (Default)</option>
                <option value="Safe Samples">Safe Samples</option>
                <option value="Attack Samples">Attack Samples</option>
              </select>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-[#052326] bg-[#EBF1ED]"
                  : "border-[#D3DDD7] hover:border-[#678882] bg-[#F9FBFA]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.eml,.email,.txt,.csv,.json,.md"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleUploadFiles(e.target.files);
                  }
                }}
                className="hidden"
              />

              <div className="w-12 h-12 bg-white text-[#2E595A] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs border border-[#E2E8E5]">
                <Upload className="w-6 h-6 text-[#2E595A]" />
              </div>
              <h4 className="font-semibold text-sm text-[#052326] mb-1">
                Drag &amp; drop files here
              </h4>
              <p className="text-xs text-[#678882] mb-3">
                or click to browse from your computer
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-[#E2E8E5] text-[11px] font-mono text-[#678882]">
                Supported: PDF • EML • TXT • CSV • JSON • MD
              </div>
            </div>

            {/* Upload Progress Bar */}
            {isProcessingUpload && (
              <div className="p-3 bg-[#EBF1ED] rounded-xl border border-[#C5DDD2] space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-[#2E595A]">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {uploadProgressText || "Processing security scan..."}
                  </span>
                </div>
                <div className="w-full bg-white h-2 rounded-full overflow-hidden">
                  <div className="bg-[#2E595A] h-full w-2/3 animate-pulse rounded-full" />
                </div>
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div className="p-3 bg-[#FDF0ED] rounded-xl border border-[#F6D0C5] text-xs text-[#C2410C] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E8ECE9]">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-[#678882] hover:text-[#052326] rounded-xl"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
