export function escapeEmailText(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buyerLocationEmailRow(requiresApproval, address) {
  const location = String(address || '').trim();
  if (requiresApproval || !location) return '';
  return `<tr>
                  <td style="padding: 10px 0; color: #64748b; font-weight: 600;">Location:</td>
                  <td style="padding: 10px 0; color: #1e293b;">${escapeEmailText(location)}</td>
                </tr>`;
}
