"use client";

// SparkContent is defined in SparkClient.tsx and re-exported here
// so TabShell can import it the same way it imports TrancheContent.
export { SparkContent } from "./SparkClient";

// Route stub — content rendered by TabShell
export default function SparkPage() { return null; }
