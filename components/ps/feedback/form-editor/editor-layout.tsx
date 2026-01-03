"use client";

import { PSForm, PSFormField } from "@/actions/ps-feedback";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QuestionsTab } from "./questions-tab";
import { SettingsTab } from "./settings-tab";
import { Card, CardContent } from "@/components/ui/card";

interface EditorLayoutProps {
  form: PSForm & { ps_form_fields: PSFormField[] };
  projectId: string;
  tasks: any[]; // Or typed properly if shared type available.
}

export function EditorLayout({ form, projectId, tasks }: EditorLayoutProps) {
  return (
    <Tabs defaultValue="questions" className="space-y-6">
      <div className="flex justify-center bg-background border-b rounded-t-lg -mt-8 pt-2 pb-0 mb-6 ">
        <TabsList className="bg-transparent h-12 w-full max-w-md justify-center">
          <TabsTrigger
            value="questions"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-8"
          >
            Questions
          </TabsTrigger>
          <TabsTrigger
            value="responses"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-8"
          >
            Responses
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none h-full px-8"
          >
            Settings
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="questions" className="space-y-6 pb-20">
        <QuestionsTab form={form} projectId={projectId} />
      </TabsContent>

      <TabsContent value="responses">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Responses view coming soon. Check the "Inbox" on the Dashboard for
            now.
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="settings">
        <SettingsTab form={form} projectId={projectId} tasks={tasks} />
      </TabsContent>
    </Tabs>
  );
}
