"use client";

import { nanoid } from "nanoid";
import type { Question, QuestionType, Option } from "@/lib/survey/types";
import { QuestionCard } from "./QuestionCard";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Type, CheckCircle, CheckSquare, Star } from "lucide-react";

interface QuestionListProps {
  questions: Question[];
  errorsMap: Record<string, string[]>;
  onChange: (questions: Question[]) => void;
  onNotification?: (msg: string) => void;
}

function SortableQuestionItem({
  question,
  index,
  totalQuestions,
  earlierQuestions,
  errors,
  onChange,
  onDuplicate,
  onDelete,
  onMove,
}: {
  question: Question;
  index: number;
  totalQuestions: number;
  earlierQuestions: Question[];
  errors?: string[];
  onChange: (q: Question) => void;
  onDuplicate: (q: Question) => void;
  onDelete: (id: string) => void;
  onMove: (idx: number, dir: "up" | "down") => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style}>
      <QuestionCard
        question={question}
        index={index}
        totalQuestions={totalQuestions}
        earlierQuestions={earlierQuestions}
        errors={errors}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onMove={onMove}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

export function QuestionList({
  questions,
  errorsMap,
  onChange,
  onNotification,
}: QuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Helper to sanitize conditions after reorder or delete
  const sanitizeConditions = (qList: Question[]): { updated: Question[]; removedCount: number } => {
    let removedCount = 0;
    const sanitized = qList.map((q, idx) => {
      if (!q.showIf) return q;

      // Earlier question IDs in this new order
      const earlierIds = new Set(qList.slice(0, idx).map((item) => item.id));

      const validConditions = q.showIf.conditions.filter((cond) => {
        const isValid = earlierIds.has(cond.questionId);
        if (!isValid) removedCount++;
        return isValid;
      });

      if (validConditions.length === 0) {
        const copy = { ...q };
        delete copy.showIf;
        return copy as Question;
      }

      return {
        ...q,
        showIf: {
          ...q.showIf,
          conditions: validConditions,
        },
      };
    });

    return { updated: sanitized, removedCount };
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);

    const reordered = arrayMove(questions, oldIndex, newIndex);
    const { updated, removedCount } = sanitizeConditions(reordered);
    onChange(updated);

    if (removedCount > 0 && onNotification) {
      onNotification(`Removed ${removedCount} invalid condition(s) due to question reordering`);
    }
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const reordered = arrayMove(questions, index, targetIndex);
    const { updated, removedCount } = sanitizeConditions(reordered);
    onChange(updated);

    if (removedCount > 0 && onNotification) {
      onNotification(`Removed ${removedCount} invalid condition(s) due to question reordering`);
    }
  };

  const handleAddQuestion = (type: QuestionType) => {
    const newId = nanoid(8);
    let newQ: Question;

    const defaultOptions: Option[] = [
      { id: nanoid(6), label: "Option 1" },
      { id: nanoid(6), label: "Option 2" },
    ];

    switch (type) {
      case "text":
        newQ = {
          id: newId,
          type: "text",
          label: "Untitled Question",
          required: false,
          maxLength: 1000,
        };
        break;
      case "single_choice":
        newQ = {
          id: newId,
          type: "single_choice",
          label: "Untitled Choice Question",
          required: false,
          options: defaultOptions,
        };
        break;
      case "multi_choice":
        newQ = {
          id: newId,
          type: "multi_choice",
          label: "Untitled Multiple Choice",
          required: false,
          options: defaultOptions,
        };
        break;
      case "rating":
        newQ = {
          id: newId,
          type: "rating",
          label: "How would you rate us?",
          required: false,
          min: 1,
          max: 5,
        };
        break;
    }

    onChange([...questions, newQ]);
  };

  const handleDuplicate = (q: Question) => {
    const freshId = nanoid(8);
    let copy: Question;

    if (q.type === "single_choice" || q.type === "multi_choice") {
      copy = {
        ...q,
        id: freshId,
        label: `${q.label} (Copy)`,
        options: q.options.map((opt) => ({ ...opt, id: nanoid(6) })),
        showIf: undefined, // Clear condition on duplicate to avoid stale dependencies
      };
    } else {
      copy = {
        ...q,
        id: freshId,
        label: `${q.label} (Copy)`,
        showIf: undefined,
      };
    }

    const currentIndex = questions.findIndex((item) => item.id === q.id);
    const nextQuestions = [...questions];
    nextQuestions.splice(currentIndex + 1, 0, copy);
    onChange(nextQuestions);
  };

  const handleDelete = (id: string) => {
    if (questions.length <= 1) return;

    const filtered = questions.filter((q) => q.id !== id);
    const { updated, removedCount } = sanitizeConditions(filtered);
    onChange(updated);

    if (removedCount > 0 && onNotification) {
      onNotification(`Removed ${removedCount} invalid condition(s) dependent on deleted question`);
    }
  };

  const handleUpdate = (updatedQ: Question) => {
    onChange(questions.map((q) => (q.id === updatedQ.id ? updatedQ : q)));
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={questions.map((q) => q.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {questions.map((q, idx) => (
              <SortableQuestionItem
                key={q.id}
                question={q}
                index={idx}
                totalQuestions={questions.length}
                earlierQuestions={questions.slice(0, idx)}
                errors={errorsMap[q.id]}
                onChange={handleUpdate}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onMove={handleMove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add question menu */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
          Add Question
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => handleAddQuestion("text")}
            className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-400 text-xs font-medium text-slate-700 transition-all text-left"
          >
            <Type className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Text Response</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion("single_choice")}
            className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-400 text-xs font-medium text-slate-700 transition-all text-left"
          >
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <span>Single Choice</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion("multi_choice")}
            className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-400 text-xs font-medium text-slate-700 transition-all text-left"
          >
            <CheckSquare className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Multiple Choice</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddQuestion("rating")}
            className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-blue-400 text-xs font-medium text-slate-700 transition-all text-left"
          >
            <Star className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Rating Scale</span>
          </button>
        </div>
      </div>
    </div>
  );
}
