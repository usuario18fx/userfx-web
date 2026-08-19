export function emitEvent(event: string, data: any) {
  const io = (global as any).io;

  if (!io) return;

  io.emit(event, data);
}