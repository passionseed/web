import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createCommunity } from '@/lib/api/community';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import Icons from '@/components/icons';

const formSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name cannot be longer than 50 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(500, 'Description cannot be longer than 500 characters'),
  short_description: z.string().max(150, 'Short description cannot be longer than 150 characters').optional(),
  is_public: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

type CreateCommunityFormProps = {
  onSuccess?: () => void;
};

export function CreateCommunityForm({ onSuccess }: CreateCommunityFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      short_description: '',
      is_public: true,
    },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      setIsLoading(true);
      const community = await createCommunity({
        ...values,
        short_description: values.short_description || values.description.slice(0, 140) + (values.description.length > 140 ? '...' : ''),
      });
      
      toast({
        title: 'Community created!',
        description: 'Your community has been created successfully.',
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/communities/${community.slug || community.id}`);
      }
    } catch (error) {
      console.error('Error creating community:', error);
      toast({
        title: 'Error',
        description: 'Failed to create community. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Community Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter community name" {...field} />
              </FormControl>
              <FormDescription>
                Choose a name that represents your community. This can't be changed later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="short_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Short Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="A brief description of your community (appears in cards and previews)" 
                  className="min-h-[100px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                A short description that will appear in community cards and previews (max 150 characters).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Tell us more about your community" 
                  className="min-h-[150px]"
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                This is the full description that will appear on your community page.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_public"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Public Community</FormLabel>
                <FormDescription>
                  {field.value
                    ? 'Anyone can see who\'s in the community and what they post.'
                    : 'Only members can see who\'s in the community and what they post.'}
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess ? onSuccess() : router.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
            Create Community
          </Button>
        </div>
      </form>
    </Form>
  );
}
