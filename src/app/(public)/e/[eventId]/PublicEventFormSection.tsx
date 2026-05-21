"use client";

import { useState } from "react";
import PublicAvailabilitySection from "./PublicAvailabilitySection";
import EventRegistrationForm from "./EventRegistrationForm";

interface Question {
  id: string;
  question_type: string;
  title: string;
  description: string | null;
  is_required: boolean;
  options: string[] | null;
}

export default function PublicEventFormSection({
  eventId,
  isFull,
  surveyId,
  organizationId,
  participationRequirements,
  questions,
  schedulingType,
}: {
  eventId: string;
  isFull: boolean;
  surveyId: string | null;
  organizationId: string;
  participationRequirements: string | null;
  questions: Question[];
  schedulingType: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  return (
    <>
      {schedulingType === "availability" && (
        <PublicAvailabilitySection
          eventId={eventId}
          onDateSelect={setSelectedDate}
          selectedDate={selectedDate}
        />
      )}
      <EventRegistrationForm
        eventId={eventId}
        isFull={isFull}
        surveyId={surveyId}
        organizationId={organizationId}
        participationRequirements={participationRequirements}
        questions={questions}
        selectedDate={schedulingType === "availability" ? selectedDate : null}
      />
    </>
  );
}
