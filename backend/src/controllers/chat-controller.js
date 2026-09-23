import * as webChatService from "../services/web-chat-service.js";

/** POST /api/chat/messages — one message to the website assistant (guest or signed in). */
export const sendMessage = async (request, response) => {
  const data = await webChatService.sendMessage(request.user, request.body);
  response.status(200).json({ data });
};
