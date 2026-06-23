from app.crud.base import BaseCRUD
from app.models.course import Course
from app.models.course_category import CourseCategory
from app.models.course_enrollment import CourseEnrollment
from app.models.course_lesson import CourseLesson
from app.models.course_payment import CoursePayment
from app.models.course_section import CourseSection
from app.models.lesson_progress import LessonProgress

crud_course = BaseCRUD(Course)
crud_course_category = BaseCRUD(CourseCategory)
crud_course_section = BaseCRUD(CourseSection)
crud_course_lesson = BaseCRUD(CourseLesson)
crud_course_enrollment = BaseCRUD(CourseEnrollment)
crud_course_payment = BaseCRUD(CoursePayment)
crud_lesson_progress = BaseCRUD(LessonProgress)
