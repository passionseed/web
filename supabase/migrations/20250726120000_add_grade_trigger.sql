-- Function to update student_node_progress status based on a new grade
CREATE OR REPLACE FUNCTION public.update_progress_on_grade() 
RETURNS TRIGGER AS $$
DECLARE
    submission_progress_id uuid;
BEGIN
    -- Get the progress_id from the submission that was just graded
    SELECT progress_id INTO submission_progress_id
    FROM public.assessment_submissions
    WHERE id = NEW.submission_id;

    -- Update the status in the student_node_progress table
    UPDATE public.student_node_progress
    SET status = NEW.grade -- NEW.grade will be 'pass' or 'fail'
    WHERE id = submission_progress_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute the function after a new grade is inserted
CREATE TRIGGER on_new_grade_update_progress
AFTER INSERT ON public.submission_grades
FOR EACH ROW
EXECUTE FUNCTION public.update_progress_on_grade();
