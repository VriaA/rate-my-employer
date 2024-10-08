"use client"

import { useState } from "react"

export default function useMessage() {
  const [messages, setMessages] = useState([])
  const [message, setMessage] = useState("")

  async function sendMessage(event) {
    if (event && event.preventDefault) {
      event.preventDefault();
    }

    if (!message.trim()) return;

    setMessage("") // Clear the message after it's sent
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message }, // Add user message
      { role: "assistant", content: "" }, // Prepare for the assistant's response
    ])

    try {
      let combinedMessage = message
      const i_response = await fetch("/api/getCompanies", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "user", content: message }),
      })

      if (!i_response.ok) {
        throw new Error("Network response was not ok")
      }

      const companies = await i_response.text();
      if (companies !== "none") {
        const companies_l = companies.split(",").map(company => company.trim().replace(/\s+/g, '-'))

        const c_response = await fetch("/api/getData", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 'companies': companies_l }),
        })

        if (!c_response.ok) {
          throw new Error("Network response was not ok")
        }

        const cdata = await c_response.text();
        combinedMessage += cdata
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([...messages, { role: "user", content: combinedMessage }]),
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value, { stream: true })

        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1]
          let otherMessages = messages.slice(0, messages.length - 1)
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ]
        })
      }
    } catch (error) {
      // REPLACES THE EMPTY STRING WITH AN ERROR MESSAGE SO THE LOADER IS REMOVED
      setMessages((messages) => [
        ...messages.slice(0, -1),
        {
          role: "assistant",
          content:
            "I'm sorry, but I encountered an error. Please try again later.",
        },
      ])
    }
  }

  return { messages, setMessages, message, setMessage, sendMessage }
}
