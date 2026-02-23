import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { noiseReferenceData } from '@/lib/data';
import { AlertCircle, ThermometerSnowflake, Sun } from 'lucide-react';

export function ReferenceView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Environmental Noise Reference</CardTitle>
          <CardDescription>
            Standard noise level limits (in decibels) recommended by health and
            safety organizations for various environments.
          </CardDescription>
        </CardHeader>
      </Card>

      <Accordion type="single" collapsible defaultValue="item-0" className="w-full">
        {noiseReferenceData.map((categoryData, index) => (
          <AccordionItem key={index} value={`item-${index}`} className="border-none">
            <Card className="mb-4">
              <AccordionTrigger className="p-6 text-lg font-semibold hover:no-underline">
                {categoryData.category}
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4">
                  {categoryData.environments.map((env, envIndex) => (
                    <Card key={envIndex} className="bg-card/80">
                      <CardHeader>
                        <CardTitle className="text-base">{env.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                          <div className="flex items-center gap-2">
                            <Sun className="w-5 h-5 text-yellow-400" />
                            <div>
                              <p className="font-medium">Daytime Limit</p>
                              <p className="text-muted-foreground">{env.day} dB</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ThermometerSnowflake className="w-5 h-5 text-blue-400" />
                            <div>
                              <p className="font-medium">Nighttime Limit</p>
                              <p className="text-muted-foreground">{env.night} dB</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50 border border-border/50">
                          <AlertCircle className="w-5 h-5 mt-1 text-primary shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            {env.complianceNote}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
