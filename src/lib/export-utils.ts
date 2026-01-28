import { Transcript } from '@/hooks/useDebateManager';

export function exportToMarkdown(transcripts: Transcript[]) {
  const date = new Date().toLocaleString();
  let markdown = `# DebateLens Transcript\n`;
  markdown += `*Exported on: ${date}*\n\n---\n\n`;

  transcripts.forEach((t) => {
    const time = new Date(t.timestamp).toLocaleTimeString();
    markdown += `### [${time}] Speaker ${t.speaker}\n`;
    markdown += `> ${t.text}\n\n`;
    
    if (t.factCheck && t.factCheck.verdict !== 'NOT_A_CLAIM') {
      markdown += `**Verdict: ${t.factCheck.verdict}**\n`;
      markdown += `${t.factCheck.explanation}\n\n`;
    }
    
    markdown += `---\n\n`;
  });

  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `debatelens-transcript-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
