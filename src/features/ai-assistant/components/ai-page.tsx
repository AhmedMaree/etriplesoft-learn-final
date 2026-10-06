"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { BookOpen, MessageSquare, GraduationCap, BarChart3, Clock, Trophy, Send, Paperclip, Lightbulb, FileText, Target, Info } from 'lucide-react';
import { Panel, Title, IconBox, Progress } from '@/components/ui/primitives';
import { Avatar } from '@/components/shared/profile-avatar';
import { useDemoNavigation } from '@/hooks/use-demo-navigation';
import { ASSET_BASE } from '@/lib/assets';
import { useTranslations } from 'next-intl';

export const prompts = [
  "Explain Odoo CRM",
  "Summarize this course",
  "Quiz me on Accounting",
  "Recommend my next course",
  "Help me prepare for the final assessment",
];

export function AIPage() {
  const t = useTranslations("ai");
  const navigate = useDemoNavigation();
  const promptLabels = [t("promptExplain"), t("promptSummarize"), t("promptStudy"), t("recommendNext"), t("prepareAssessment")];

  const [context, setContext] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I’m your ETripleSoft Learn AI Assistant. 👋\nI can help you with course content, explain concepts, create practice quizzes, recommend courses, and more. What would you like to learn today?",
    },
    { role: "user", text: "Can you explain what Odoo CRM is?" },
    {
      role: "assistant",
      text: "Of course! Odoo CRM is a customer relationship management module in Odoo that helps manage leads, opportunities, and customer interactions in one place.",
    },
  ]);
  React.useEffect(() => {
    if (messages.length > 3) {
      const box = document.querySelector(".chat-messages");
      if (box) box.scrollTop = box.scrollHeight;
    }
  }, [messages]);
  function send(text = input) {
    if (!text.trim()) return;
    const reply = /quiz|assessment/i.test(text)
      ? "Let’s practice: Which Odoo module manages customer invoices and tracks payments? A. Accounting, B. Sales, C. Inventory, D. Purchase. You can also open the final assessment from your course."
      : /recommend/i.test(text)
        ? "Based on your current Odoo learning path, Python Fundamentals is a useful next step before Odoo Development. Explore both in Our Courses."
        : /summar/i.test(text)
          ? "This course introduces ERP workflows and the Accounting, CRM, Sales, Purchase, and Inventory modules. You will apply these concepts in a business case and complete a final assessment."
          : "Odoo CRM helps you organize leads and opportunities in a sales pipeline. Each opportunity can include contact information, planned activities, and expected revenue. This is a local demo answer based on the course topics.";
    setMessages((m) => [
      ...m,
      { role: "user", text },
      { role: "assistant", text: reply },
    ]);
    setInput("");
  }
  return (
    <div className="columns">
      <div className="primary">
        <section className="hero ai-hero">
          <Image
            src={ASSET_BASE + "ai-character.png"}
            alt={t("title")}
            width={512}
            height={512}
            loading="eager"
          />
          <div className="hero-copy">
            <div className="eyebrow">{t("heroEyebrow")}</div>
            <h2>
              {t("heroTitle")}
            </h2>
            <p>{t("heroCopy")}</p>
          </div>
          <div className="ai-features">
            {[Lightbulb, BarChart3, FileText, GraduationCap].map((I, i) => (
              <div key={i}>
                <IconBox icon={I} color={i % 3 === 0 ? "green" : "blue"} />
                <span>
                  {
                    [
                      "Get instant answers",
                      "Personalized recommendations",
                      "Step-by-step explanations",
                      "Support your learning goals",
                    ][i]
                  }
                </span>
              </div>
            ))}
          </div>
        </section>
        <Panel className="chat-panel">
          <span className="today-label">{t("today")}</span>
          <div className="chat-messages" aria-live="polite">
            {messages.map((m, i) => (
              <div className={"message " + m.role} key={i}>
                {m.role === "assistant" ? (
                  <Image
                    className="bot-avatar"
                    src={ASSET_BASE + "ai-character.png"}
                    alt="Assistant"
                    width={46}
                    height={46}
                  />
                ) : (
                  <Avatar />
                )}
                <div>
                  <div className="bubble">{m.text}</div>
                  <small>9:{41 + i} AM</small>
                </div>
              </div>
            ))}
          </div>
          <Title
            link={t("viewPrompts")}
            onClick={() => setInput("Help me with Odoo development")}
          >
            {t("tryAsking")}
          </Title>
          <div className="prompt-grid">
            {prompts.map((p, i) => (
              <button onClick={() => send(p)} key={p}>
                <IconBox
                  icon={
                    [BookOpen, FileText, GraduationCap, BarChart3, Target][i]
                  }
                  color={i % 2 ? "green" : "blue"}
                />
                {promptLabels[i]}
              </button>
            ))}
          </div>
          <form
            className="chat-input"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Paperclip size={22} />
            <input
              aria-label={t("askLabel")}
              placeholder={t("placeholderLong")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button
              className="send-button"
              aria-label={t("send")}
              disabled={!input.trim()}
            >
              <Send size={21} />
            </button>
          </form>
          <small className="ai-disclaimer">{t("disclaimerLong")}</small>
        </Panel>
      </div>
      <aside className="right-rail">
        <Panel>
          <Title onClick={() => navigate("courses")}>{t("contextTitle")}</Title>
          <div className="context-course">
            <span className="odoo-tile">odoo</span>
            <div>
              <b>Odoo Development</b>
              <small>Odoo Development</small>
              <Progress value={35} />
            </div>
          </div>
          <div className="context-info">
            <p><Info />{t("contextInfo")}</p>
            <label>
              {t("useContext")}
              <button
                role="switch"
                aria-checked={context}
                aria-label="Use current course context"
                className={"switch " + (context ? "on" : "")}
                onClick={() => setContext(!context)}
              />
            </label>
          </div>
        </Panel>
        <Panel>
          <Title
            link="View All"
            onClick={() => setMessages(messages.slice(0, 3))}
          >
            {t("recentConversations")}
          </Title>
          {[
            "Explain Odoo CRM",
            "Summarize this course",
            "Help me with domains in Odoo",
            "Quiz me on Accounting",
            "Recommend my next course",
          ].map((p, i) => (
            <button className="recent-row" key={p} onClick={() => send(p)}>
              <MessageSquare size={21} />
              <div>
                <span>{p}</span>
                <small>
                  {
                    [
                      "Odoo CRM is a customer relation...",
                      "Here’s a summary of the key topi...",
                      "In Odoo, domains are used to filt...",
                      "Here are 10 practice questions...",
                      "Based on your progress and inte...",
                    ][i]
                  }
                </small>
              </div>
              <small>
                {["Today", "Yesterday", "Mar 10", "Mar 9", "Mar 8"][i]}
              </small>
            </button>
          ))}
        </Panel>
        <Panel>
          <Title link={t("viewDetails")} onClick={() => navigate("certificates")}>
            {t("insights")}
          </Title>
          {["Questions asked", "Topics explored", "Study sessions with AI"].map(
            (t, i) => (
              <div className="insight" key={t}>
                <IconBox icon={[Clock, BookOpen, GraduationCap][i]} />
                <b>{[27, 8, 4][i]}</b>
                <small>{t}</small>
                <span>↑ {12 + i * 19}%</span>
              </div>
            ),
          )}
          <div className="completion">
            <Trophy />
            <div>
              <b>{t("curiosity")}</b>
              <p>
                You’re actively exploring new topics.
                <br />
                Keep it up!
              </p>
            </div>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
